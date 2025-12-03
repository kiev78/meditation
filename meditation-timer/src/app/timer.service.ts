import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Subscription, interval, timer, of, concat } from 'rxjs';
import { switchMap, takeWhile, tap, map, filter, take } from 'rxjs/operators';
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
    theme: 'light',
    isRunning: false,
  };

  private stateSubject = new BehaviorSubject<TimerState>(this.initialState);
  state$ = this.stateSubject.asObservable();

  // Public getter to access current value synchronously if needed by components
  get stateSubjectValue(): TimerState {
    return this.stateSubject.value;
  }

  private timerSubscription: Subscription | null = null;
  private wakeLock: any = null; // WakeLockSentinel

  constructor() {
    this.initSettings();
  }

  private initSettings() {
    const saved = this.settingsService.loadSettings();
    if (saved) {
      const mergedState = { ...this.initialState, ...saved };
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

    // We want to count up from -delay to 0, then from duration down to 0.
    const delaySeconds = currentState.delay;
    const durationSeconds = currentState.remainingTime > 0 && currentState.remainingTime < currentState.duration
                          ? currentState.remainingTime // Resume functionality: if paused, resume from where we left off
                          : currentState.duration;     // Start fresh

    let stream;

    if (delaySeconds > 0) {
      // Delay Sequence: -delay, ..., -1
      const delayTickerImmediate = timer(0, 1000).pipe(
        map(i => -delaySeconds + i),
        take(delaySeconds)
      );

      stream = concat(
        delayTickerImmediate.pipe(
          tap(val => this.updateState({ remainingTime: val }))
        ),
        of(0).pipe(
          // Transition point: Play bell, immediately set remainingTime to duration to avoid flicker, then switch to main timer
          tap(() => {
             this.bellService.playBell();
             this.updateState({ remainingTime: durationSeconds }); // Ensure UI jumps to full time/resume time
          }),
          switchMap(() => interval(1000).pipe(
            map(tick => durationSeconds - (tick + 1)),
            takeWhile(remaining => remaining >= 0)
          ))
        )
      );
    } else {
      // No delay
      stream = of(0).pipe(
        tap(() => this.bellService.playBell()),
        switchMap(() => interval(1000).pipe(
          map(tick => durationSeconds - (tick + 1)),
          takeWhile(remaining => remaining >= 0)
        ))
      );
    }

    this.timerSubscription = stream.subscribe({
      next: (remaining: any) => {
        // remaining can be negative or positive
        if (typeof remaining === 'number') {
           this.updateState({ remainingTime: remaining });

           if (remaining >= 0) {
             this.checkInterval(remaining);
             if (remaining === 0) {
               this.bellService.playBell();
               this.stop();
             }
           }
        }
      }
    });
  }

  pause() {
    this.updateState({ isRunning: false });
    this.releaseWakeLock();
    if (this.timerSubscription) {
      this.timerSubscription.unsubscribe();
      this.timerSubscription = null;
    }
  }

  // Called when timer ends naturally
  private stop() {
    this.pause();
    this.updateState({ remainingTime: this.stateSubject.value.duration }); // Reset for next run
  }

  reset() {
    this.pause();
    const currentState = this.stateSubject.value;
    this.updateState({ remainingTime: currentState.duration });
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

  updateState(newState: Partial<TimerState>) {
    const updatedState = { ...this.stateSubject.value, ...newState };
    this.stateSubject.next(updatedState);
    this.settingsService.saveSettings(updatedState);
  }

  toggleTheme() {
    const currentTheme = this.stateSubject.value.theme;
    this.updateState({ theme: currentTheme === 'light' ? 'dark' : 'light' });
  }

  private async requestWakeLock() {
    if ('wakeLock' in navigator) {
      try {
        this.wakeLock = await (navigator as any).wakeLock.request('screen');
      } catch (err) {
        console.warn('Wake Lock request failed:', err);
      }
    }
  }

  private releaseWakeLock() {
    if (this.wakeLock) {
      this.wakeLock.release().then(() => {
        this.wakeLock = null;
      }).catch((err: any) => console.warn('Wake Lock release failed:', err));
    }
  }
}
