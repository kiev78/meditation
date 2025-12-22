import { Component, Input, Output, EventEmitter, OnDestroy, OnInit, inject, NgZone, ChangeDetectorRef, OnChanges, SimpleChanges } from '@angular/core';
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
  @Output() next = new EventEmitter<void>();

  private http = inject(HttpClient);
  public timerService = inject(TimerService);
  private bellService = inject(BellService);
  private ngZone = inject(NgZone);
  private cdr = inject(ChangeDetectorRef);
  private timerSub: Subscription | null = null;
  private isGuidedMode = false;
  private bellSequenceSubscription: Subscription | null = null;

  selected: any | null = null;
  audio: HTMLAudioElement | null = null;
  isPlaying = false;
  audioReady = false;
  currentTime = 0;
  totalDuration = 0;
  private timeUpdateInterval: any = null;
  loadError = false;

  private audioCtx: AudioContext | null = null;
  private noiseProcessor: ScriptProcessorNode | null = null;
  private gainNode: GainNode | null = null;

  ngOnInit(): void {
    if (this.meditation) {
      this.selected = this.meditation;
      this.prepareAudio();
    }
    
    this.timerSub = this.timerService.state$.subscribe(state => {
      this.isGuidedMode = !!state.isGuided;

      if (this.isGuidedMode) {
        this.totalDuration = state.duration;
        const rem = state.remainingTime;
        const elapsed = rem < 0 || rem > state.duration ? 0 : state.duration - rem;
        this.currentTime = elapsed;

        // Schedule playback based on current elapsed time and running state
        this.checkSchedule(elapsed, state.duration, state.isRunning, state.isBellSequenceRunning, state.remainingTime);

        this.clearTimeUpdate();
      } else {
        this.clearScheduled();
      }
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['meditation'] && changes['meditation'].currentValue) {
      const newMeditation = changes['meditation'].currentValue;
      if (this.selected && this.selected.title === newMeditation.title && this.selected['start-url'] === newMeditation['start-url']) {
        return;
      }
      this.selected = newMeditation;
      this.prepareAudio();
      this.persistLastPlayed();

      // Reschedule if running
      const state = this.timerService.stateSubjectValue;
      if (state.isGuided) {
         const elapsed = state.duration - state.remainingTime;
         this.checkSchedule(elapsed, state.duration, state.isRunning, state.isBellSequenceRunning, state.remainingTime);
      }
    }
  }

  ngOnDestroy(): void {
    this.stop();
    if (this.audio) {
      this.audio.pause();
      this.audio = null;
    }
    if (this.endAudio) {
      this.endAudio.pause();
      this.endAudio = null;
    }
    this.stopNoise();
    if (this.audioCtx) {
      this.audioCtx.close();
      this.audioCtx = null;
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

  onNext() {
    this.next.emit();
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
  private endAudio: HTMLAudioElement | null = null;

  private clearScheduled() {
    if (this.scheduledStartTimeout) {
      clearTimeout(this.scheduledStartTimeout);
      this.scheduledStartTimeout = null;
    }
    if (this.scheduledEndTimeout) {
      clearTimeout(this.scheduledEndTimeout);
      this.scheduledEndTimeout = null;
    }
    if (this.audio) {
        this.audio.pause();
        this.isPlaying = false;
    }
    if (this.endAudio) {
        this.endAudio.pause();
    }
    this.stopNoise();
  }

  private checkSchedule(elapsed: number, duration: number, isRunning: boolean, isBellSequenceRunning: boolean, remainingTime: number) {
    if (!this.selected || !isRunning) {
      this.clearScheduled();
      return;
    }
    if (isBellSequenceRunning || remainingTime < 0) {
      return;
    }
    
    const overlap = 0.1; 
    const startDur = parseDurationToSeconds(this.selected['start-url-duration'] || this.selected['start_url_duration'] || this.selected.duration || this.selected['duration']);
    const endDur = parseDurationToSeconds(this.selected['end-url-duration'] || this.selected['end_url_duration'] || null) || 0;

    const startAudioEndTime = startDur || 0;
    const endAudioStartTime = duration - endDur;

    // Rule for Start Audio
    if (elapsed < startAudioEndTime) {
      this.playStartUrl(elapsed);
    } else {
      if (this.audio && !this.audio.paused) this.audio.pause();
    }

    // Rule for Noise
    if (elapsed >= startAudioEndTime - overlap && elapsed < endAudioStartTime) {
      this.startNoise();
    } else {
      this.stopNoise();
    }

    // Rule for End Audio
    if (elapsed >= endAudioStartTime - overlap) {
      if (endDur > 0 && this.selected['end-url']) {
        const seekPos = elapsed - endAudioStartTime;
        this.playEndUrl(Math.max(0, seekPos)); // Play from 0 during overlap
      }
    } else {
      if (this.endAudio && !this.endAudio.paused) this.endAudio.pause();
    }
  }

  private startNoise() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    if (!this.noiseProcessor) {
      const bufferSize = 4096;
      this.noiseProcessor = this.audioCtx.createScriptProcessor(bufferSize, 1, 1);
      this.noiseProcessor.onaudioprocess = (e) => {
        const output = e.outputBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          output[i] = Math.random() * 2 - 1;
        }
      };
    }

    if (!this.gainNode) {
      this.gainNode = this.audioCtx.createGain();
      this.noiseProcessor.connect(this.gainNode);
      this.gainNode.connect(this.audioCtx.destination);
    }
    
    this.gainNode.gain.setValueAtTime(0.004, this.audioCtx.currentTime); // lower value for less noise
  }

  private stopNoise() {
    if (this.gainNode) {
      this.gainNode.gain.setValueAtTime(0, this.audioCtx!.currentTime);
    }
  }

  private playStartUrl(seekTime: number) {
    if (!this.selected) return;
    if (!this.audio) {
        this.audio = new Audio();
        this.audio.src = this.selected['start-url'];
    }
    // Only set current time if we are significantly off, to avoid stutter on every update
    if (Math.abs(this.audio.currentTime - seekTime) > 0.5) {
        this.audio.currentTime = seekTime;
    }

    if (this.audio.paused) {
      this.audio.play().catch(() => {});
    }
    this.isPlaying = true;
  }

  private playEndUrl(seekTime: number) {
    if (!this.selected) return;
    if (!this.endAudio) {
        this.endAudio = new Audio();
        this.endAudio.src = this.selected['end-url'];
    }

    if (Math.abs(this.endAudio.currentTime - seekTime) > 0.5) {
        this.endAudio.currentTime = seekTime;
    }

    if (this.endAudio.paused) {
      this.endAudio.play().catch(() => {});
    }
  }

  togglePlay(): void {
    if (this.isGuidedMode) {
      if (this.timerService.stateSubjectValue.isRunning) {
        this.timerService.pause();
      } else {
        this.timerService.start();
      }
      return;
    }
    // Non-guided mode logic omitted for brevity as this component is primarily for guided mode now
  }

  stop(): void {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
    }
    if (this.endAudio) {
      this.endAudio.pause();
      this.endAudio.currentTime = 0;
    }
    this.isPlaying = false;
    this.currentTime = 0;
    this.clearTimeUpdate();
  }

  seek(event: Event): void {
    const target = event.target as HTMLInputElement;
    const time = Number(target.value);

    // In guided timer mode, seek the timer
    if (this.timerService.stateSubjectValue.isGuided) {
      const newRemaining = this.timerService.stateSubjectValue.duration - time;
      this.timerService.seek(newRemaining);
      // The state subscription will pick up the change and call checkSchedule
    }
  }

  skipBack(): void {
    if (this.timerService.stateSubjectValue.isGuided) {
      const state = this.timerService.stateSubjectValue;
      const elapsed = state.duration - state.remainingTime;
      const newElapsed = Math.max(0, elapsed - 10);
      const newRemaining = state.duration - newElapsed;
      this.timerService.seek(newRemaining);
    }
  }

  skipForward(): void {
    if (this.timerService.stateSubjectValue.isGuided) {
      const state = this.timerService.stateSubjectValue;
      const elapsed = state.duration - state.remainingTime;
      const newElapsed = Math.min(state.duration, elapsed + 10);
      const newRemaining = state.duration - newElapsed;
      this.timerService.seek(newRemaining);
    }
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

    if (this.audio) {
      this.audio.pause();
      this.audio = null;
    }
    if (this.endAudio) {
        this.endAudio.pause();
        this.endAudio = null;
    }

    this.audioReady = false;
    this.loadError = false;

    if (this.selected['start-url']) {
        this.audio = new Audio();
        this.audio.preload = 'auto';
        this.audio.src = this.selected['start-url'];

        this.audio.oncanplay = () => {
          this.ngZone.run(() => {
            this.audioReady = true;
            this.cdr.detectChanges();
          });
        };

        this.audio.onerror = () => {
            this.ngZone.run(() => {
                this.loadError = true;
            });
        };
    }
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

// Kept for compatibility if needed, but no longer used in this component's logic
export function computeBellSequenceDuration(count: number, intervals: number[]): number {
  if (!count || count <= 0) return 0;
  if (count === 1) return 0; // first bell immediate, no waiting
  let total = 0;
  for (let i = 0; i < count - 1; i++) {
    total += intervals[i] !== undefined ? intervals[i] : 5;
  }
  return total;
}
