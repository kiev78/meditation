import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Subscription, timer, Observable, of, concat } from 'rxjs';
import { take, map } from 'rxjs/operators';
import { TimerState } from './timer-state.interface';
import { BellService } from './bell.service';
import { SettingsService } from './settings.service';

@Injectable({
  providedIn: 'root',
})
export class TimerService {
  private bellService = inject(BellService);
  private settingsService = inject(SettingsService);

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
  private wakeLock: any = null;

  constructor() {
    this.initSettings();
    this.settingsService.settings$.subscribe((settings) => {
      this.updateStateInternal({ ...settings, remainingTime: settings.duration || this.initialState.duration });
    });
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
      this.stateSubject.next(mergedState);
    }
  }

  start(options?: { isSeek?: boolean }) {
    if (this.stateSubjectValue.isRunning) {
      return;
    }

    this.requestWakeLock();

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
    
    this.updateState({ isRunning: true, totalDuration: totalDuration, elapsed: startElapsed });

    this.timerSubscription = timer(0, 1000)
      .pipe(take(totalDuration - startElapsed + 1))
      .subscribe({
        next: (tick) => {
          const currentElapsed = startElapsed + tick;
          const state = this.stateSubjectValue; // Get latest state
          let phase: TimerState['phase'] = state.phase;
          let remainingTime = state.remainingTime;

          // State machine to determine phase
          if (currentElapsed < delayDuration) {
            phase = 'delay';
            remainingTime = delayDuration - currentElapsed;
            if (state.phase !== 'delay') {
              this.updateState({ phase: 'delay' });
            }
          } else if (currentElapsed < delayDuration + bellDuration) {
            phase = 'bells';
            remainingTime = (delayDuration + bellDuration) - currentElapsed;
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
          this.releaseWakeLock();
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
    this.releaseWakeLock();
  }

  reset() {
    this.pause();
    const duration = this.stateSubjectValue.duration;
    this.updateState({ remainingTime: duration, elapsed: 0, phase: 'stopped' });
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
    if ('duration' in newState || 'delay' in newState || 'intervals' in newState || 'startBells' in newState || 'endBells' in newState || 'theme' in newState || 'isGuided' in newState) {
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

  private async requestWakeLock() {
    if ('wakeLock' in navigator) {
      try {
        this.wakeLock = await (navigator as any).wakeLock.request('screen');
        this.updateState({ isWakeLockActive: true });
        this.wakeLock.addEventListener('release', () => {
          this.updateState({ isWakeLockActive: false });
        });
      } catch (err) {
        console.warn('Wake Lock request failed:', err);
      }
    }
  }

  private releaseWakeLock() {
    if (this.wakeLock) {
      this.wakeLock.release().then(() => {
        this.wakeLock = null;
      });
    }
  }
}
