import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  constructor() {}

  // Stub methods for local storage
  saveSettings(settings: any) {
    console.log('Settings saved (stub)', settings);
  }

  loadSettings() {
    console.log('Settings loaded (stub)');
    return {};
  }
}
