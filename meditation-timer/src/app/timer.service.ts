import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Subscription, interval, timer, of, concat } from 'rxjs';
import { switchMap, takeWhile, tap, map, take } from 'rxjs/operators';
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
    duration: 1800, // 30 minutes
    remainingTime: 1800,
    delay: 5,
    intervals: 0,
    startBells: 1,
    startBellIntervals: [5], // Default interval for bells > 1
    endBells: 1,
    endBellIntervals: [5], // Default interval for bells > 1
    theme: 'light',
    isRunning: false,
    isWakeLockActive: false,
  };

  private stateSubject = new BehaviorSubject<TimerState>(this.initialState);
  state$ = this.stateSubject.asObservable();

  // Public getter to access current value synchronously if needed by components
  get stateSubjectValue(): TimerState {
    return this.stateSubject.value;
  }

  private timerSubscription: Subscription | null = null;
  private bellSequenceSubscription: Subscription | null = null;
  private wakeLock: any = null; // WakeLockSentinel

  constructor() {
    this.initSettings();
    this.settingsService.settings$.subscribe((settings) => {
      this.updateStateInternal(settings);
    });
  }

  private initSettings() {
    const saved = this.settingsService.loadSettings();
    if (saved) {
      const mergedState = { ...this.initialState, ...saved };

      // Ensure arrays are initialized if missing from saved (though migration should handle it)
      if (!mergedState.startBellIntervals || mergedState.startBellIntervals.length === 0) {
          mergedState.startBellIntervals = [5];
      }
      if (!mergedState.endBellIntervals || mergedState.endBellIntervals.length === 0) {
          mergedState.endBellIntervals = [5];
      }

      mergedState.remainingTime = mergedState.duration; // Reset to full duration
      mergedState.isRunning = false;
      this.stateSubject.next(mergedState);
    }
  }

  start() {
    if (this.stateSubject.value.isRunning) return;

    this.updateState({ isRunning: true });
    this.requestWakeLock();

    const currentState = this.stateSubject.value;
    const duration = currentState.duration;
    const remaining = currentState.remainingTime;
    const delay = currentState.delay;

    const isFreshStart = (remaining === duration);
    const isPausedInDelay = (remaining < 0);

    let delayStream = null;

    if (delay > 0) {
      if (isFreshStart) {
        // Fresh start: Count from -delay to -1
        delayStream = timer(0, 1000).pipe(
          map(i => -delay + i),
          take(delay)
        );
      } else if (isPausedInDelay) {
        // Resume delay: Count from current remaining (negative) to -1
        const ticks = Math.abs(remaining);
        delayStream = timer(0, 1000).pipe(
          map(i => remaining + i),
          take(ticks)
        );
      }
    }

    // Determine the starting duration for the main timer phase
    const durationToUse = (delayStream || isFreshStart) ? duration : remaining;

    const durationStream = of(0).pipe(
      tap(() => {
        // Only play the start bell if we are starting a fresh session or transitioning from delay
        const shouldPlayBell = (delayStream !== null) || isFreshStart;
        if (shouldPlayBell) {
          const state = this.stateSubject.value;
          this.playBellSequence(state.startBells, state.startBellIntervals);
          this.updateState({ remainingTime: duration });
        }
      }),
      switchMap(() => interval(1000).pipe(
        map(tick => durationToUse - (tick + 1)),
        takeWhile(val => val >= 0)
      ))
    );

    let stream;
    if (delayStream) {
      stream = concat(
        delayStream.pipe(
          tap(val => this.updateState({ remainingTime: val }))
        ),
        durationStream
      );
    } else {
      stream = durationStream;
    }

    this.timerSubscription = stream.subscribe({
      next: (val: any) => {
        if (typeof val === 'number') {
           this.updateState({ remainingTime: val });

           if (val >= 0) {
             this.checkInterval(val);
             if (val === 0) {
               const state = this.stateSubject.value;
               this.playBellSequence(state.endBells, state.endBellIntervals);
               this.stop();
             }
           }
        }
      }
    });
  }

  pause() {
    this._stopTimer();
    this.bellService.stopBell();
    if (this.bellSequenceSubscription) {
        this.bellSequenceSubscription.unsubscribe();
        this.bellSequenceSubscription = null;
    }
  }

  // Called when timer ends naturally
  private stop() {
    this._stopTimer();
    this.updateState({ remainingTime: this.stateSubject.value.duration }); // Reset for next run
  }

  reset() {
    this.pause();
    const currentState = this.stateSubject.value;
    this.updateState({ remainingTime: currentState.duration });
  }

  private _stopTimer() {
    this.updateState({ isRunning: false });
    this.releaseWakeLock();
    if (this.timerSubscription) {
      this.timerSubscription.unsubscribe();
      this.timerSubscription = null;
    }
  }

  private checkInterval(remainingTime: number) {
    const state = this.stateSubject.value;
    if (state.intervals <= 0) return;

    const passedTime = state.duration - remainingTime;
    const intervalSeconds = state.intervals * 60;

    if (passedTime > 0 && remainingTime > 0 && passedTime % intervalSeconds === 0) {
      this.bellService.playBell();
    }
  }

  private playBellSequence(count: number, intervals: number[]) {
    if (this.bellSequenceSubscription) {
        this.bellSequenceSubscription.unsubscribe();
    }

    if (count <= 0) return;

    const observables = [];

    // First bell always rings immediately
    observables.push(of(null));

    // Subsequent bells
    // We only have count-1 intervals
    for (let i = 0; i < count - 1; i++) {
        const intervalSec = intervals[i] !== undefined ? intervals[i] : 5;
        // timer(delay) emits after delay and completes.
        observables.push(timer(intervalSec * 1000));
    }

    // concat executes them sequentially
    // of(null) emits, then timer(d1) waits d1 then emits, then timer(d2) waits d2 then emits...
    this.bellSequenceSubscription = concat(...observables).subscribe(() => {
        this.bellService.playBell();
    });
  }

  updateState(newState: Partial<TimerState>) {
    this.updateStateInternal(newState);
    this.settingsService.saveSettings(newState, false);
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
        this.updateState({ isWakeLockActive: false });
      }
    } else {
      console.warn('Wake Lock API not supported.');
      this.updateState({ isWakeLockActive: false });
    }
  }

  private releaseWakeLock() {
    if (this.wakeLock) {
      this.wakeLock.release().then(() => {
        this.wakeLock = null;
        this.updateState({ isWakeLockActive: false });
      }).catch((err: any) => {
        console.warn('Wake Lock release failed:', err);
        this.updateState({ isWakeLockActive: false });
      });
    }
  }
}
