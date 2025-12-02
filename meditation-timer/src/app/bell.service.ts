import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class BellService {
  private audio: HTMLAudioElement;

  constructor() {
    this.audio = new Audio('/bell.mp3');
    this.audio.load();
  }

  playBell() {
    this.audio.currentTime = 0;
    this.audio.play().catch(error => {
      console.warn('Bell audio playback failed. User interaction might be required.', error);
    });
  }
}
