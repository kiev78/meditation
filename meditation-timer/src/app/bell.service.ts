import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class BellService {
  private activeAudios: Set<HTMLAudioElement> = new Set();
  private readonly BELL_PATH = 'sounds/bell.mp3';

  constructor() {
    // Preload one instance to ensure browser caches it
    const preload = new Audio(this.BELL_PATH);
    preload.load();
  }

  playBell() {
    const audio = new Audio(this.BELL_PATH);

    // Track this audio instance
    this.activeAudios.add(audio);

    // Remove from tracking when it finishes playing
    audio.onended = () => {
      this.activeAudios.delete(audio);
    };

    audio.play().catch(error => {
      console.warn('Bell audio playback failed. User interaction might be required.', error);
      // Clean up if playback fails
      this.activeAudios.delete(audio);
    });
  }

  stopBell() {
    this.activeAudios.forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });
    this.activeAudios.clear();
  }
}
