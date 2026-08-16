import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Subscription, timer, Observable, of, concat } from 'rxjs';
import { take, map, distinctUntilChanged } from 'rxjs/operators';
import { TimerState } from './timer-state.interface';
import { BellService } from './bell.service';
import { SettingsService } from './settings.service';
import { WakeLockService } from './wake-lock.service';

@Injectable({
  providedIn: 'root',
})
export class TimerService {
  private bellService = inject(BellService);
  private settingsService = inject(SettingsService);
  private wakeLockService = inject(WakeLockService);

  private initialState: TimerState = {
    duration: 1800, // Meditation duration
    remainingTime: 1800,
    delay: 5,
    intervals: 0,
    startBells: 1,
    startBellIntervals: [5], // Default interval for bells > 1
    endBells: 1,
    endBellIntervals: [5], // Default interval for bells > 1
    theme: 'dark',
    isRunning: false,
    isWakeLockActive: false,
    isGuided: false,
    isBellSequenceRunning: false,
    preTimerPhase: null,
    // New state properties for the unified timeline
    phase: 'stopped', // 'stopped', 'delay', 'bells', 'meditation', 'paused'
    elapsed: 0, // Total elapsed time for the whole sequence
    totalDuration: 0, // Total duration of the whole sequence
  };

  private stateSubject = new BehaviorSubject<TimerState>(this.initialState);
  state$ = this.stateSubject.asObservable();

  get stateSubjectValue(): TimerState {
    return this.stateSubject.value;
  }

  private timerSubscription: Subscription | null = null;
  private bellSequenceSubscription: Subscription | null = null;
  private lastToggleTime = 0;

  constructor() {
    this.initSettings();
    if (this.settingsService?.settings$) {
      this.settingsService.settings$.subscribe((settings) => {
        this.updateStateInternal({ ...settings, remainingTime: settings.duration || this.initialState.duration });
      });
    }
    if (this.wakeLockService?.isActive$) {
      this.wakeLockService.isActive$.subscribe((isActive) => {
        this.updateStateInternal({ isWakeLockActive: isActive });
      });
    }
  }

  public getBellSequenceDurationInSeconds(count: number, intervals: number[]): number {
    if (count <= 0) return 0;
    let totalSec = 0;
    for (let i = 0; i < count - 1; i++) {
      totalSec += intervals[i] !== undefined ? intervals[i] : 5;
    }
    totalSec += this.bellService.bellDuration;
    return totalSec; // Return seconds directly
  }

  private initSettings() {
    const saved = this.settingsService.loadSettings();
    if (saved) {
      const mergedState: TimerState = {
        ...this.initialState,
        ...saved,
        remainingTime: saved.duration || this.initialState.duration,
        isRunning: false,
        phase: 'stopped',
        elapsed: 0,
        isBellSequenceRunning: false,
        preTimerPhase: null,
      };

      // Calculate totalDuration based on the merged state
      const delayDuration = mergedState.delay;
      const bellDuration = this.getBellSequenceDurationInSeconds(mergedState.startBells, mergedState.startBellIntervals);
      mergedState.totalDuration = delayDuration + bellDuration + mergedState.duration;

      this.stateSubject.next(mergedState);
    }
  }

  toggle() {
    const now = Date.now();
    if (now - this.lastToggleTime < 800) {
      return;
    }
    this.lastToggleTime = now;

    if (this.stateSubjectValue.isRunning) {
      this.pause();
    } else {
      this.start();
    }
  }

  start(options?: { isSeek?: boolean }) {
    if (this.stateSubjectValue.isRunning) {
      return;
    }

    this.wakeLockService.acquire();

    const currentState = this.stateSubjectValue;

    // Determine phase durations
    const delayDuration = options?.isSeek ? 0 : currentState.delay;
    const bellDuration = options?.isSeek ? 0 : Math.ceil(this.calculateBellSequenceDurationMs(currentState.startBells, currentState.startBellIntervals) / 1000);
    const meditationDuration = currentState.duration;
    const totalDuration = delayDuration + bellDuration + meditationDuration;

    // Determine starting elapsed time (0 for fresh start, saved value for resume)
    let startElapsed = options?.isSeek ? (currentState.duration - currentState.remainingTime) + delayDuration + bellDuration : currentState.elapsed;

    // On a fresh start, reset elapsed time
    if (currentState.phase === 'stopped' || currentState.phase === 'finished') {
      startElapsed = 0;
    }
    
    // Determine initial state values
    let initialRemainingTime = currentState.remainingTime;
    let initialPhase: TimerState['phase'] = 'meditation';
    if (startElapsed < delayDuration) {
      initialPhase = 'delay';
      initialRemainingTime = -(delayDuration - startElapsed);
    } else if (startElapsed < delayDuration + bellDuration) {
      initialPhase = 'bells';
      initialRemainingTime = -((delayDuration + bellDuration) - startElapsed);
    } else {
      initialPhase = 'meditation';
      initialRemainingTime = totalDuration - startElapsed;
    }

    this.updateState({
      isRunning: true,
      totalDuration: totalDuration,
      elapsed: startElapsed,
      phase: initialPhase,
      remainingTime: initialRemainingTime,
      isBellSequenceRunning: initialPhase === 'bells'
    });

    if (initialPhase === 'bells' && (currentState.phase === 'stopped' || currentState.phase === 'finished')) {
      this.playBellSequence(currentState.startBells, currentState.startBellIntervals);
    }

    const startTimestamp = Date.now() - (startElapsed * 1000);

    this.timerSubscription = timer(0, 500)
      .pipe(
        map(() => Math.min(totalDuration, Math.floor((Date.now() - startTimestamp) / 1000))),
        distinctUntilChanged(),
        take(totalDuration - startElapsed + 1)
      )
      .subscribe({
        next: (currentElapsed) => {
          const state = this.stateSubjectValue; // Get latest state
          let phase: TimerState['phase'] = state.phase;
          let remainingTime = state.remainingTime;

          // State machine to determine phase
          if (currentElapsed < delayDuration) {
            phase = 'delay';
            remainingTime = -(delayDuration - currentElapsed);
            if (state.phase !== 'delay') {
              this.updateState({ phase: 'delay' });
            }
          } else if (currentElapsed < delayDuration + bellDuration) {
            phase = 'bells';
            remainingTime = -((delayDuration + bellDuration) - currentElapsed);
            if (state.phase !== 'bells') {
              this.updateState({ phase: 'bells' });
              this.playBellSequence(state.startBells, state.startBellIntervals);
            }
          } else {
            phase = 'meditation';
            remainingTime = totalDuration - currentElapsed;
            if (state.phase !== 'meditation') {
              this.updateState({ phase: 'meditation' });
            }
          }
          
          this.updateState({
            elapsed: currentElapsed,
            remainingTime: remainingTime,
            isBellSequenceRunning: phase === 'bells' // Simplified flag
          });
        },
        complete: () => {
          const finalState = this.stateSubjectValue;
          this.updateState({ phase: 'finished', isRunning: false, remainingTime: finalState.duration, elapsed: 0 });
          this.playBellSequence(finalState.endBells, finalState.endBellIntervals);
          this.wakeLockService.release();
        }
      });
  }

  pause() {
    if (!this.stateSubjectValue.isRunning) return;

    if (this.timerSubscription) {
      this.timerSubscription.unsubscribe();
      this.timerSubscription = null;
    }
    this.bellService.stopBell();
    if (this.bellSequenceSubscription) {
      this.bellSequenceSubscription.unsubscribe();
      this.bellSequenceSubscription = null;
    }
    this.updateState({ isRunning: false, phase: 'paused' });
    this.wakeLockService.release();
  }

  reset() {
    this.pause();
    const duration = this.stateSubjectValue.duration;
    this.updateState({ remainingTime: duration, elapsed: 0, phase: 'stopped' });
    this.wakeLockService.release();
  }

  seek(newRemaining: number) {
    const wasRunning = this.stateSubjectValue.isRunning;
    const wasPaused = !wasRunning;
    this.pause();
    
    this.updateState({ remainingTime: newRemaining });

    if (wasRunning) {
      this.start({ isSeek: true });
    } else if (wasPaused) {
      const currentState = this.stateSubjectValue;
      const newElapsed = currentState.duration - newRemaining;
      this.updateState({ elapsed: newElapsed, totalDuration: currentState.duration });
    }
  }

  public calculateBellSequenceDurationMs(count: number, intervals: number[]): number {
    if (count <= 0) return 0;
    let totalSec = 0;
    for (let i = 0; i < count - 1; i++) {
      totalSec += intervals[i] !== undefined ? intervals[i] : 5;
    }
    totalSec += this.bellService.bellDuration;
    return totalSec * 1000;
  }

  private playBellSequence(count: number, intervals: number[]) {
    if (this.bellSequenceSubscription) {
      this.bellSequenceSubscription.unsubscribe();
    }
    if (count <= 0) return;

    const observables: Observable<any>[] = [of(null)];
    for (let i = 0; i < count - 1; i++) {
      const intervalSec = intervals[i] !== undefined ? intervals[i] : 5;
      observables.push(timer(intervalSec * 1000));
    }
    
    this.bellSequenceSubscription = concat(...observables).subscribe(() => {
      this.bellService.playBell();
    });
  }

  updateState(newState: Partial<TimerState>) {
    this.updateStateInternal(newState);
    if ('duration' in newState || 'delay' in newState || 'intervals' in newState || 'startBells' in newState || 'endBells' in newState || 'theme' in newState || 'isGuided' in newState || 'videoCallUrl' in newState || 'backgroundImage' in newState) {
      this.settingsService.saveSettings(newState, false);
    }
  }

  private updateStateInternal(newState: Partial<TimerState>) {
    const updatedState = { ...this.stateSubject.value, ...newState };
    this.stateSubject.next(updatedState);
  }

  toggleTheme() {
    const currentTheme = this.stateSubject.value.theme;
    this.updateState({ theme: currentTheme === 'light' ? 'dark' : 'light' });
  }
}
