import { Injectable } from '@angular/core';
import { TimerState } from './timer-state.interface';

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private readonly STORAGE_KEY = 'meditation_timer_settings';

  constructor() {}

  saveSettings(settings: Partial<TimerState>) {
    try {
      const currentSettings = this.loadSettings() || {};
      const newSettings = { ...currentSettings, ...settings };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(newSettings));
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
