import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Subscription, interval, timer, of, concat, Observable } from 'rxjs';
import { switchMap, takeWhile, tap, map, take, delay } from 'rxjs/operators';
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
    theme: 'dark',
    isRunning: false,
    isWakeLockActive: false,
    isGuided: false,
    isBellSequenceRunning: false,
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
      mergedState.isBellSequenceRunning = false;
      this.stateSubject.next(mergedState);
    }
  }

  start() {
    if (this.stateSubject.value.isRunning) return;

    this.requestWakeLock();

    const currentState = this.stateSubject.value;
    const duration = currentState.duration;
    const remaining = currentState.remainingTime;
    const initialStartDelay = currentState.delay;

    const isFreshStart = (remaining === duration);
    const isPausedInDelay = (remaining < 0);

    // If starting fresh with a delay, set state immediately to prevent glitches
    if (initialStartDelay > 0 && isFreshStart) {
        this.updateState({ isRunning: true, remainingTime: -initialStartDelay });
    } else {
        this.updateState({ isRunning: true });
    }

    let delayStream: Observable<any> | null = null;

    if (initialStartDelay > 0) {
      if (isFreshStart) {
        // Fresh start: Count from -delay to -1
        delayStream = timer(0, 1000).pipe(
          map(i => -initialStartDelay + i),
          take(initialStartDelay)
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
      switchMap(() => {
        // Only play the start bell if we are starting a fresh session or transitioning from delay
        const shouldPlayBell = (delayStream !== null) || isFreshStart;

        let bellDelayMs = 0;
        if (shouldPlayBell) {
           const state = this.stateSubject.value;
           this.updateState({ isBellSequenceRunning: true });

           // Calculate duration of bell sequence to delay the timer
           bellDelayMs = this.calculateBellSequenceDurationMs(state.startBells, state.startBellIntervals);

           this.playBellSequence(state.startBells, state.startBellIntervals);
           this.updateState({ remainingTime: duration });
        } else {
           // Resuming from pause (not fresh start)
           bellDelayMs = 0;
        }

        // Wait for bells to finish, then start counting
        return timer(bellDelayMs).pipe(
          tap(() => {
             if (shouldPlayBell) {
               this.updateState({ isBellSequenceRunning: false });
             }
          }),
          switchMap(() => interval(1000).pipe(
            map(tick => durationToUse - (tick + 1)),
            takeWhile(val => val >= 0)
          ))
        );
      })
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

  seek(newRemaining: number) {
    const wasRunning = this.stateSubject.value.isRunning;
    this.pause(); // Stops timer, bells, sequences. Sets isRunning=false.

    // Ensure we don't go below the negative delay limit (if we want to be strict)
    // or just trust the component. Let's trust for now but ensure we update correctly.
    this.updateState({ remainingTime: newRemaining });

    if (wasRunning) {
      this.start(); // Restart the timer from the new timestamp
    }
  }

  private _stopTimer() {
    this.updateState({ isRunning: false, isBellSequenceRunning: false });
    this.releaseWakeLock();
    if (this.timerSubscription) {
      this.timerSubscription.unsubscribe();
      this.timerSubscription = null;
    }
  }

  private checkInterval(remainingTime: number) {
    const state = this.stateSubject.value;
    if (state.intervals <= 0 || state.isGuided) return;

    const passedTime = state.duration - remainingTime;
    const intervalSeconds = state.intervals * 60;

    if (passedTime > 0 && remainingTime > 0 && passedTime % intervalSeconds === 0) {
      this.bellService.playBell();
    }
  }

  private calculateBellSequenceDurationMs(count: number, intervals: number[]): number {
    if (count <= 0) return 0;

    let totalSec = 0;
    // Sum intervals between bells
    for (let i = 0; i < count - 1; i++) {
        totalSec += intervals[i] !== undefined ? intervals[i] : 5;
    }

    // Add the duration of the bells themselves.
    // Bell rings at T=0 (length bellDuration).
    // Next bell at T=Interval (length bellDuration).
    // Total sequence time until silence = (Sum of Intervals) + Last Bell Duration.
    // However, technically if intervals are long enough, bells don't overlap.
    // But we just want the "busy time".
    // If intervals are short, bells overlap.
    // The sequence "ends" when the last bell finishes ringing.
    // Last bell starts at T = Sum(intervals).
    // It ends at T = Sum(intervals) + bellDuration.

    totalSec += this.bellService.bellDuration;

    return totalSec * 1000;
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
