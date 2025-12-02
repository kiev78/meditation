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
  };

  private stateSubject = new BehaviorSubject<TimerState>(this.initialState);
  state$ = this.stateSubject.asObservable();

  constructor() {}

  updateState(newState: Partial<TimerState>) {
    this.stateSubject.next({ ...this.stateSubject.value, ...newState });
  }

  toggleTheme() {
    const currentTheme = this.stateSubject.value.theme;
    this.updateState({ theme: currentTheme === 'light' ? 'dark' : 'light' });
  }
}
