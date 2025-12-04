import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class BellService {
  private activeAudios: Set<HTMLAudioElement> = new Set();
  private readonly BELL_PATH = 'sounds/bell.mp3';
  private readonly VOLUME_KEY = 'meditation-timer-volume';
  private readonly MUTE_KEY = 'meditation-timer-muted';
  private readonly PREV_VOLUME_KEY = 'meditation-timer-prev-volume';

  private volumeSubject = new BehaviorSubject<number>(1);
  volume$ = this.volumeSubject.asObservable();

  private isMutedSubject = new BehaviorSubject<boolean>(false);
  isMuted$ = this.isMutedSubject.asObservable();

  constructor() {
    // Preload one instance to ensure browser caches it
    const preload = new Audio(this.BELL_PATH);
    preload.load();
    this.loadSettings();
  }

  private loadSettings() {
    const savedVolume = localStorage.getItem(this.VOLUME_KEY);
    const savedMute = localStorage.getItem(this.MUTE_KEY);

    let initialVolume = 1;
    if (savedVolume !== null) {
      initialVolume = parseFloat(savedVolume);
    }

    let initialMute = false;
    if (savedMute !== null) {
      initialMute = savedMute === 'true';
    }

    // Apply settings
    this.audio.volume = initialVolume;
    this.volumeSubject.next(initialVolume);
    this.isMutedSubject.next(initialMute);

    // Ensure consistency: if volume is 0, it's effectively muted
    if (initialVolume === 0) {
        this.isMutedSubject.next(true);
    }
  }

  playBell() {


    const audio = new Audio(this.BELL_PATH);

    // Track this audio instance
    this.activeAudios.add(audio);

    // Ensure volume is set correctly before playing
    audio.volume = this.volumeSubject.value;

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

  setVolume(volume: number) {
    // Clamp volume between 0 and 1
    const newVolume = Math.max(0, Math.min(1, volume));

    this.audio.volume = newVolume;
    this.volumeSubject.next(newVolume);

    // Update mute state based on volume
    const isMuted = newVolume === 0;
    this.isMutedSubject.next(isMuted);

    localStorage.setItem(this.VOLUME_KEY, newVolume.toString());
    localStorage.setItem(this.MUTE_KEY, isMuted.toString());
  }

  toggleMute() {
    const isMuted = this.isMutedSubject.value;
    const currentVolume = this.volumeSubject.value;

    if (isMuted) {
      // Unmute
      // Retrieve previous volume or default to 100%
      const prevVolumeStr = localStorage.getItem(this.PREV_VOLUME_KEY);
      let restoreVolume = prevVolumeStr ? parseFloat(prevVolumeStr) : 1;

      // Edge case: if stored prev volume is 0 (shouldn't happen with correct logic, but safe guard), set to 1
      if (restoreVolume === 0) restoreVolume = 1;

      this.setVolume(restoreVolume);
    } else {
      // Mute
      // Store current volume before muting, so we can restore it
      // Only store if it's > 0, otherwise we lose the "previous" state
      if (currentVolume > 0) {
        localStorage.setItem(this.PREV_VOLUME_KEY, currentVolume.toString());
      }
      this.setVolume(0);
    }
  }

  setVolume(volume: number) {
    // Clamp volume between 0 and 1
    const newVolume = Math.max(0, Math.min(1, volume));

    this.audio.volume = newVolume;
    this.volumeSubject.next(newVolume);

    // Update mute state based on volume
    const isMuted = newVolume === 0;
    this.isMutedSubject.next(isMuted);

    localStorage.setItem(this.VOLUME_KEY, newVolume.toString());
    localStorage.setItem(this.MUTE_KEY, isMuted.toString());
  }

  toggleMute() {
    const isMuted = this.isMutedSubject.value;
    const currentVolume = this.volumeSubject.value;

    if (isMuted) {
      // Unmute
      // Retrieve previous volume or default to 100%
      const prevVolumeStr = localStorage.getItem(this.PREV_VOLUME_KEY);
      let restoreVolume = prevVolumeStr ? parseFloat(prevVolumeStr) : 1;

      // Edge case: if stored prev volume is 0 (shouldn't happen with correct logic, but safe guard), set to 1
      if (restoreVolume === 0) restoreVolume = 1;

      this.setVolume(restoreVolume);
    } else {
      // Mute
      // Store current volume before muting, so we can restore it
      // Only store if it's > 0, otherwise we lose the "previous" state
      if (currentVolume > 0) {
        localStorage.setItem(this.PREV_VOLUME_KEY, currentVolume.toString());
      }
      this.setVolume(0);
    }
  }
}
