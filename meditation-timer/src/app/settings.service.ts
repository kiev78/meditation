import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { TimerState } from './timer-state.interface';

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private readonly STORAGE_KEY = 'meditation_timer_settings';

  // Subject to emit settings changes. Using Subject instead of BehaviorSubject
  // because we load initial state separately.
  private settingsSubject = new Subject<Partial<TimerState>>();

  // Public observable for other services to subscribe to
  settings$ = this.settingsSubject.asObservable();

  constructor() {}

  /**
   * Saves settings to localStorage and emits the change.
   * @param settings The partial settings to save.
   * @param emit Whether to emit the change to subscribers (default true).
   *             Set to false to avoid circular updates if the caller is the one reacting to a change.
   */
  saveSettings(settings: Partial<TimerState>, emit: boolean = true) {
    try {
      const currentSettings = this.loadSettings() || {};
      const newSettings = { ...currentSettings, ...settings };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(newSettings));

      if (emit) {
        this.settingsSubject.next(settings);
      }
    } catch (e) {
      console.error('Error saving settings to localStorage', e);
    }
  }

  loadSettings(): Partial<TimerState> | null {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      console.error('Error loading settings from localStorage', e);
      return null;
    }
  }
}
