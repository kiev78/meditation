<<<<<<< HEAD
import { Injectable, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { TimerState } from './timer-state.interface';
import { BellService } from './bell.service';

@Injectable({
  providedIn: 'root',
})
export class TimerService {
  private bellService = inject(BellService);

  private initialState: TimerState = {
    duration: 1800, // 30 minutes
    delay: 5,
    intervals: 0,
    theme: 'light',
    isRunning: false,
=======
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { TimerState } from './timer-state.interface';

@Injectable({
  providedIn: 'root'
})
export class TimerService {
  private initialState: TimerState = {
    duration: 1800, // 30 minutes
    delay: 45,
    intervals: 0,
    theme: 'light',
    isRunning: false
>>>>>>> jules-meditation-timer-phase1-revised
  };

  private stateSubject = new BehaviorSubject<TimerState>(this.initialState);
  state$ = this.stateSubject.asObservable();

<<<<<<< HEAD
  private timer: any;
  private delayTimer: any;

  constructor() {}

  start() {
    if (this.stateSubject.value.isRunning) return;

    this.updateState({ isRunning: true });

    this.delayTimer = setTimeout(() => {
      this.bellService.playBell(); // Play bell at the start
      this.timer = setInterval(() => {
        const state = this.stateSubject.value;
        if (state.duration > 0) {
          this.updateState({ duration: state.duration - 1 });

          if (state.intervals > 0 && state.duration % state.intervals === 0) {
            this.bellService.playBell();
          }
        } else {
          this.bellService.playBell(); // Play bell at the end
          this.pause();
        }
      }, 1000);
    }, this.stateSubject.value.delay * 1000);
  }

  pause() {
    this.updateState({ isRunning: false });
    clearTimeout(this.delayTimer);
    clearInterval(this.timer);
  }

  reset() {
    this.pause();
    this.updateState({ duration: this.initialState.duration });
  }

=======
  constructor() {}

>>>>>>> jules-meditation-timer-phase1-revised
  updateState(newState: Partial<TimerState>) {
    this.stateSubject.next({ ...this.stateSubject.value, ...newState });
  }

  toggleTheme() {
    const currentTheme = this.stateSubject.value.theme;
    this.updateState({ theme: currentTheme === 'light' ? 'dark' : 'light' });
  }
}
