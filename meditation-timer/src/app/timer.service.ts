import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Subscription, interval, timer, of } from 'rxjs';
import { switchMap, takeWhile, tap, map, filter } from 'rxjs/operators';
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
    const delayMs = currentState.delay * 1000;

    this.timerSubscription = timer(delayMs).pipe(
      tap(() => this.bellService.playBell()), // Play start bell
      switchMap(() => interval(1000).pipe(
        map(tick => currentState.remainingTime - (tick + 1)), // tick starts at 0, so 1st emit is 1 sec passed
        takeWhile(remaining => remaining >= 0)
      ))
    ).subscribe({
      next: (remaining) => {
        this.updateState({ remainingTime: remaining });
        this.checkInterval(remaining);

        if (remaining === 0) {
          this.bellService.playBell(); // Play end bell
          this.stop();
        }
      },
      complete: () => {
        // Timer completed naturally (reached 0)
        // Handled in next(0) block above
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

    // Check if passedTime is a multiple of intervalSeconds
    // We also want to avoid ringing at the very start (passedTime=0) if that logic slips in,
    // and we avoid ringing at the very end (remainingTime=0) because the end bell handles that.
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
