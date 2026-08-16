import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type BellSound = 'bell1' | 'bell2' | 'bell3';

@Injectable({
  providedIn: 'root'
})
export class BellService {
  private activeAudios: Set<HTMLAudioElement> = new Set();
  private readonly BELL_PATHS: Record<BellSound, string> = {
    bell1: 'sounds/bell1.mp3',
    bell2: 'sounds/bell2.mp3',
    bell3: 'sounds/bell3.mp3',
  };
  private readonly VOLUME_KEY = 'meditation-timer-volume';
  private readonly MUTE_KEY = 'meditation-timer-muted';
  private readonly PREV_VOLUME_KEY = 'meditation-timer-prev-volume';
  private readonly BELL_SOUND_KEY = 'meditation-timer-bell-sound';

  private previousVolume = 1;
  private volumeSubject = new BehaviorSubject<number>(1);
  volume$ = this.volumeSubject.asObservable();

  private isMutedSubject = new BehaviorSubject<boolean>(false);
  isMuted$ = this.isMutedSubject.asObservable();

  private bellSoundSubject = new BehaviorSubject<BellSound>('bell1');
  bellSound$ = this.bellSoundSubject.asObservable();

  private bellDurations: Record<BellSound, number> = {
    bell1: 10,
    bell2: 10,
    bell3: 10,
  };

  public bellDuration = 10; // Default to 10s, updated on metadata load

  get selectedBell(): BellSound {
    return this.bellSoundSubject.value;
  }

  constructor() {
    this.preloadBells();
    this.loadSettings();
  }

  private preloadBells() {
    (Object.keys(this.BELL_PATHS) as BellSound[]).forEach((sound) => {
      const audio = new Audio(this.BELL_PATHS[sound]);
      audio.onloadedmetadata = () => {
        if (audio.duration && !isNaN(audio.duration)) {
          this.bellDurations[sound] = audio.duration;
          if (this.bellSoundSubject.value === sound) {
            this.bellDuration = audio.duration;
          }
        }
      };
      audio.load();
    });
  }

  private loadSettings() {
    const savedSound = localStorage.getItem(this.BELL_SOUND_KEY) as BellSound;
    if (savedSound === 'bell1' || savedSound === 'bell2' || savedSound === 'bell3') {
      this.setBellSound(savedSound);
    } else {
      this.setBellSound('bell1');
    }

    const savedVolume = localStorage.getItem(this.VOLUME_KEY);
    const savedMute = localStorage.getItem(this.MUTE_KEY);

    let initialVolume = 1;
    if (savedVolume !== null) { // Check for null or undefined
      const parsedVolume = parseFloat(savedVolume);
      if (!isNaN(parsedVolume)) {
        initialVolume = parsedVolume;
      }
    }

    // Apply settings
    this.volumeSubject.next(initialVolume);

    // Mute state is derived from volume.
    const isMuted = initialVolume === 0;
    this.isMutedSubject.next(isMuted);

    // Load the last non-zero volume for un-muting.
    const prevVolumeStr = localStorage.getItem(this.PREV_VOLUME_KEY);
    if (prevVolumeStr) {
      this.previousVolume = parseFloat(prevVolumeStr) || 1;
    }
  }

  setBellSound(sound: BellSound) {
    const validSound: BellSound = (sound === 'bell2' || sound === 'bell3') ? sound : 'bell1';
    this.bellSoundSubject.next(validSound);
    if (this.bellDurations[validSound]) {
      this.bellDuration = this.bellDurations[validSound];
    }
    localStorage.setItem(this.BELL_SOUND_KEY, validSound);
  }

  playBell(sound?: BellSound) {
    const bellToPlay: BellSound = sound || this.bellSoundSubject.value;
    const path = this.BELL_PATHS[bellToPlay] || this.BELL_PATHS.bell1;
    const audio = new Audio(path);

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

    // Store the last non-zero volume for the mute toggle
    if (newVolume > 0) {
      this.previousVolume = newVolume;
    }

    this.activeAudios.forEach(audio => {
      audio.volume = newVolume;
    });

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
