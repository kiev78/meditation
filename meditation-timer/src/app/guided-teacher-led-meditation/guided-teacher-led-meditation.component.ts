import { Component, Input, OnDestroy, OnInit, inject, NgZone, ChangeDetectorRef, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSliderModule } from '@angular/material/slider';
import { HttpClient } from '@angular/common/http';
import { TimerService } from '../timer.service';
import { Subscription, of, timer, concat } from 'rxjs';
import { BellService } from '../bell.service';

@Component({
  selector: 'app-guided-teacher-led-meditation',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatSliderModule],
  templateUrl: './guided-teacher-led-meditation.component.html',
  styleUrls: ['./guided-teacher-led-meditation.component.css']
})
export class GuidedTeacherLedMeditationComponent implements OnInit, OnDestroy, OnChanges {
  @Input() teacher: string | null = null;
  @Input() time: number | null = null; // minutes (optional)
  @Input() type: string | null = null;
  @Input() meditation: any | null = null;

  private http = inject(HttpClient);
  private timerService = inject(TimerService);
  private bellService = inject(BellService);
  private ngZone = inject(NgZone);
  private cdr = inject(ChangeDetectorRef);
  private timerSub: Subscription | null = null;
  private isGuidedMode = false;
  private bellSequenceSubscription: Subscription | null = null;

  meditations: any[] = [];
  filteredMeditations: any[] = [];
  currentIndex = 0;
  selected: any | null = null;
  audio: HTMLAudioElement | null = null;
  isPlaying = false;
  audioReady = false;
  currentTime = 0;
  totalDuration = 0;
  private timeUpdateInterval: any = null;
  loadError = false;

  ngOnInit(): void {
    // If meditation is provided as @Input, set it immediately
    if (this.meditation) {
      this.selected = this.meditation;
      this.prepareAudio();
    }
    
    this.http.get<any[]>('meditation/meditation-guided-files.json').subscribe(list => {
      this.ngZone.run(() => {
        this.meditations = Array.isArray(list) ? list : [];
        // If meditation wasn't provided, select one from the list
        if (!this.meditation) {
          this.selectMeditation();
        }
      });
    });

    this.timerSub = this.timerService.state$.subscribe(state => {
      this.isGuidedMode = !!state.isGuided;

      if (this.isGuidedMode) {
        // When in guided timer mode, drive the UI from timer state
        this.totalDuration = state.duration;
        // remainingTime may be negative during delay; clamp elapsed
        const rem = state.remainingTime;
        const elapsed = rem < 0 || rem > state.duration ? 0 : state.duration - rem;
        this.currentTime = elapsed;

        // On fresh start schedule audio relative to bells
        if (state.isRunning && state.remainingTime === state.duration) {
          this.scheduleForRun(state.duration, state.startBells, state.startBellIntervals, state.endBells, state.endBellIntervals);
        }

        // Ensure audio-based time updates are not running
        this.clearTimeUpdate();
      } else {
        // Not guided mode: nothing special, allow audio to drive UI when playing
        this.clearScheduled();
      }
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['meditation'] && changes['meditation'].currentValue) {
      const newMeditation = changes['meditation'].currentValue;
      // Avoid re-preparing if it's the same meditation object.
      if (this.selected && this.selected.title === newMeditation.title && this.selected['start-url'] === newMeditation['start-url']) {
        return;
      }
      this.selected = newMeditation;
      this.prepareAudio();
    }

    if ((changes['time'] || changes['teacher'] || changes['type']) && this.meditations.length > 0) {
      this.selectMeditation();
    }
  }

  ngOnDestroy(): void {
    this.stop();
    if (this.audio) {
      this.audio.pause();
      this.audio.oncanplay = null;
      this.audio.onended = null;
      this.audio.onerror = null;
      this.audio.ontimeupdate = null;
      this.audio = null;
    }
    if (this.timerSub) {
      this.timerSub.unsubscribe();
      this.timerSub = null;
    }
    if (this.bellSequenceSubscription) {
      this.bellSequenceSubscription.unsubscribe();
    }
    this.clearScheduled();
    this.clearTimeUpdate();
  }

  selectMeditation(): void {
    if (!this.meditations || this.meditations.length === 0) return;

    let filtered = this.meditations;

    if (this.teacher) {
      filtered = filtered.filter(m => m.teacher && m.teacher.toLowerCase() === this.teacher!.toLowerCase());
    }

    if (this.type) {
      filtered = filtered.filter(m => m.type && m.type.toLowerCase() === this.type!.toLowerCase());
    }

    if (this.time !== null && this.time !== undefined) {
      const targetSec = Math.round(Number(this.time) * 60);
      filtered = filtered.filter(m => {
        const startDur = parseDurationToSeconds(m['start-url-duration'] || m['start_url_duration'] || m.duration || m['duration']);
        if (startDur === null) return false;
        return startDur <= targetSec;
      });
    }

    this.filteredMeditations = filtered;
    this.currentIndex = 0;
    this.selected = this.filteredMeditations.length > 0 ? this.filteredMeditations[this.currentIndex] : null;

    if (!this.selected) {
      this.audioReady = false;
      this.loadError = false;
      if (this.audio) this.audio.pause();
      this.totalDuration = 0;
      this.currentTime = 0;
      this.cdr.detectChanges();
      return;
    }

    this.prepareAudio();
    this.persistLastPlayed();
  }

  playNext(): void {
    if (this.filteredMeditations.length <= 1) return;
  
    this.currentIndex = (this.currentIndex + 1) % this.filteredMeditations.length;
    this.selected = this.filteredMeditations[this.currentIndex];
    this.handleMeditationChange();
  }
  
  playPrevious(): void {
    if (this.filteredMeditations.length <= 1) return;
  
    this.currentIndex = (this.currentIndex - 1 + this.filteredMeditations.length) % this.filteredMeditations.length;
    this.selected = this.filteredMeditations[this.currentIndex];
    this.handleMeditationChange();
  }
  
  private handleMeditationChange(): void {
    this.currentTime = 0;
    this.totalDuration = 0;
    this.persistLastPlayed();
  
    if (this.timerService.stateSubjectValue.isGuided) {
      const s = this.timerService.stateSubjectValue;
      this.scheduleForRun(s.duration, s.startBells, s.startBellIntervals, s.endBells, s.endBellIntervals);
    } else {
      this.prepareAudio();
    }
  }
  
  private persistLastPlayed(): void {
    if (!this.selected) return;
    try {
      const key = 'lastGuidedMeditations';
      const raw = localStorage.getItem(key);
      const arr = raw ? JSON.parse(raw) as any[] : [];
      arr.push({ title: this.selected.title, teacher: this.selected.teacher, when: new Date().toISOString() });
      while (arr.length > 20) arr.shift();
      localStorage.setItem(key, JSON.stringify(arr));
    } catch (e) {
      // ignore storage errors
    }
  }

  private scheduledStartTimeout: any = null;
  private scheduledEndTimeout: any = null;

  private clearScheduled() {
    if (this.scheduledStartTimeout) {
      clearTimeout(this.scheduledStartTimeout);
      this.scheduledStartTimeout = null;
    }
    if (this.scheduledEndTimeout) {
      clearTimeout(this.scheduledEndTimeout);
      this.scheduledEndTimeout = null;
    }
  }

  private scheduleForRun(duration: number, startBells: number, startIntervals: number[]|undefined, endBells: number, endIntervals: number[]|undefined) {
    this.clearScheduled();
    if (!this.selected) return;

    const startDur = parseDurationToSeconds(this.selected['start-url-duration'] || this.selected['start_url_duration'] || this.selected.duration || this.selected['duration']);
    const endDur = parseDurationToSeconds(this.selected['end-url-duration'] || this.selected['end_url_duration'] || null) || 0;

    const bellSeq = computeBellSequenceDuration(startBells, startIntervals || [5]);
    const startOffset = bellSeq + 3; // start 3s after last bell

    // schedule start audio
    if (this.selected['start-url']) {
      const startMs = Math.max(0, Math.round(startOffset * 1000));
      this.scheduledStartTimeout = setTimeout(() => {
        this.playStartUrl();
      }, startMs);
    }

    // schedule end audio to finish before timer end (so bell plays immediately after)
    if (endDur > 0 && this.selected['end-url']) {
      const endStartSec = Math.max(0, duration - endDur);
      const endStartMs = Math.round(endStartSec * 1000);
      this.scheduledEndTimeout = setTimeout(() => {
        this.playEndUrl();
      }, endStartMs);
    }
  }

  private playStartUrl() {
    if (!this.selected) return;
    if (!this.audio) this.audio = new Audio();
    this.audio.src = this.selected['start-url'];
    this.audio.play().catch(() => {});
    this.isPlaying = true;
  }

  private playEndUrl() {
    if (!this.selected) return;
    const endAudio = new Audio();
    endAudio.src = this.selected['end-url'];
    endAudio.play().catch(() => {});
  }

  togglePlay(): void {
    if (!this.selected || !this.audioReady) return;

    if (this.isGuidedMode) {
      if (this.timerService.stateSubjectValue.isRunning) {
        this.timerService.pause();
      } else {
        this.timerService.start();
      }
      return;
    }
    
    if (this.isPlaying) {
      this.audio!.pause();
      this.isPlaying = false;
      this.clearTimeUpdate();
      if (this.bellSequenceSubscription) {
        this.bellSequenceSubscription.unsubscribe();
        this.bellSequenceSubscription = null;
      }
      this.bellService.stopBell();
    } else {
      const state = this.timerService.stateSubjectValue;
      const count = state.startBells;
      const intervals = state.startBellIntervals || [5];
      
      if (count > 0) {
        const bellSeqDuration = computeBellSequenceDuration(count, intervals);

        // Play bell sequence
        const observables = [];
        observables.push(of(null)); // First bell
        for (let i = 0; i < count - 1; i++) {
            const intervalSec = intervals[i] !== undefined ? intervals[i] : 5;
            observables.push(timer(intervalSec * 1000));
        }

        this.bellSequenceSubscription = concat(...observables).subscribe(() => {
            this.bellService.playBell();
        });

        // Wait for sequence to end before starting audio
        const totalWait = (bellSeqDuration + this.bellService.bellDuration) * 1000;
        
        setTimeout(() => {
          if (this.bellSequenceSubscription) { // check if it wasn't cancelled
            this.audio!.play().catch(() => { this.isPlaying = false; });
            this.isPlaying = true;
            this.startTimeUpdate();
          }
        }, totalWait);
      } else {
        // No bells, just play audio
        this.audio!.play().catch(() => { this.isPlaying = false; });
        this.isPlaying = true;
        this.startTimeUpdate();
      }
    }
  }

  stop(): void {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
    }
    this.isPlaying = false;
    this.currentTime = 0;
    this.clearTimeUpdate();
  }

  seek(event: Event): void {
    const target = event.target as HTMLInputElement;
    const time = Number(target.value);
    if (this.audio) {
      this.audio.currentTime = time;
      this.currentTime = time;
    }
    // If in guided timer mode, also seek the timer
    if (this.timerService.stateSubjectValue.isGuided) {
      const newRemaining = this.timerService.stateSubjectValue.duration - time;
      this.timerService.seek(newRemaining);
    }
  }

  skipBack(): void {
    if (this.timerService.stateSubjectValue.isGuided) {
      const state = this.timerService.stateSubjectValue;
      const elapsed = state.duration - state.remainingTime;
      const newElapsed = Math.max(0, elapsed - 10);
      const newRemaining = state.duration - newElapsed;
      this.timerService.seek(newRemaining);
    } else if (this.audio) {
      this.audio.currentTime = Math.max(0, this.audio.currentTime - 10);
    }
  }

  skipForward(): void {
    if (this.timerService.stateSubjectValue.isGuided) {
      const state = this.timerService.stateSubjectValue;
      const elapsed = state.duration - state.remainingTime;
      const newElapsed = Math.min(state.duration, elapsed + 10);
      const newRemaining = state.duration - newElapsed;
      this.timerService.seek(newRemaining);
    } else if (this.audio) {
      this.audio.currentTime = Math.min(this.audio.duration, this.audio.currentTime + 10);
    }
  }

  private startTimeUpdate(): void {
    this.clearTimeUpdate();
    this.timeUpdateInterval = setInterval(() => {
      if (this.audio) {
        this.currentTime = this.audio.currentTime;
      }
    }, 100);
  }

  private clearTimeUpdate(): void {
    if (this.timeUpdateInterval) {
      clearInterval(this.timeUpdateInterval);
      this.timeUpdateInterval = null;
    }
  }

  formatTime(seconds: number): string {
    if (!seconds && seconds !== 0) return '00:00';
    seconds = Math.max(0, Math.floor(seconds));
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  formatLabel = (value: number): string => {
    return this.formatTime(value);
  }

  private prepareAudio(): void {
    if (!this.selected) {
      return;
    }

    // reset existing audio
    if (this.audio) {
      this.audio.pause();
      // Remove event listeners from the old audio object to prevent memory leaks
      this.audio.oncanplay = null;
      this.audio.onended = null;
      this.audio.onerror = null;
      this.audio.ontimeupdate = null;
      this.clearTimeUpdate();
      this.isPlaying = false;
    }

    this.audioReady = false;
    this.loadError = false;

    this.audio = new Audio();
    this.audio.preload = 'auto';
    this.audio.src = this.selected['start-url'] || this.selected.url || '';


    this.audio.oncanplay = () => {
      this.ngZone.run(() => {
        this.audioReady = true;
        if (!this.isGuidedMode) {
          this.totalDuration = this.audio!.duration || 0;
        }
        this.cdr.detectChanges();
      });
    };

    this.audio.onended = () => {
      this.ngZone.run(() => {
        this.isPlaying = false;
        if (!this.isGuidedMode) this.currentTime = 0;
        this.clearTimeUpdate();
      });
    };

    this.audio.onerror = (e) => {
      this.ngZone.run(() => {
        this.audioReady = false;
        this.isPlaying = false;
        this.clearTimeUpdate();
        this.loadError = true;
      });
    };

    this.audio.ontimeupdate = () => {
      this.ngZone.run(() => {
        if (!this.isGuidedMode && this.audio) this.currentTime = this.audio.currentTime;
      });
    };
  }
}

export function parseDurationToSeconds(d: string | null | undefined): number | null {
  if (!d || typeof d !== 'string') return null;
  const parts = d.split(':').map(p => Number(p));
  if (parts.some(p => Number.isNaN(p))) return null;
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return null;
}

export function computeBellSequenceDuration(count: number, intervals: number[]): number {
  if (!count || count <= 0) return 0;
  if (count === 1) return 0; // first bell immediate, no waiting
  let total = 0;
  for (let i = 0; i < count - 1; i++) {
    total += intervals[i] !== undefined ? intervals[i] : 5;
  }
  return total;
}