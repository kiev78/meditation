import { Component, Input, Output, EventEmitter, OnDestroy, OnInit, inject, NgZone, ChangeDetectorRef, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSliderModule } from '@angular/material/slider';
import { HttpClient } from '@angular/common/http';
import { TimerService } from '../timer.service';
import { Subscription } from 'rxjs';
import { BellService } from '../bell.service';
import { TimerState } from '../timer-state.interface';

@Component({
  selector: 'app-guided-teacher-led-meditation',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatSliderModule],
  templateUrl: './guided-teacher-led-meditation.component.html',
  styleUrls: ['./guided-teacher-led-meditation.component.css']
})
export class GuidedTeacherLedMeditationComponent implements OnInit, OnDestroy, OnChanges {
  @Input() meditation: any | null = null;
  @Output() next = new EventEmitter<void>();

  public timerService = inject(TimerService);
  private bellService = inject(BellService);
  private ngZone = inject(NgZone);
  private cdr = inject(ChangeDetectorRef);
  private timerSub: Subscription | null = null;
  private volumeSub: Subscription | null = null;
  private isSwitchingMeditation = false;

  selected: any | null = null;
  currentVolume = 1;
  audio: HTMLAudioElement | null = null;
  audioReady = false;
  currentTime = 0; // Elapsed time for the meditation phase specifically
  totalDuration = 0; // Duration of the meditation phase
  loadError = false;

  private endAudio: HTMLAudioElement | null = null;
  private audioCtx: AudioContext | null = null;
  private noiseProcessor: ScriptProcessorNode | null = null;
  private gainNode: GainNode | null = null;

  ngOnInit(): void {
    this.volumeSub = this.bellService.volume$.subscribe(vol => {
      this.currentVolume = vol;
      if (this.audio) this.audio.volume = vol;
      if (this.endAudio) this.endAudio.volume = vol;
      // Note: noise generator gain is hardcoded to 0.004 in startNoise(),
      // could be scaled by volume here if needed, but noise is background.
    });

    this.timerService.updateState({ isGuided: true });
    if (this.meditation) {
      this.selected = this.meditation;
      this.prepareAudio();
    }
    
    this.timerSub = this.timerService.state$.subscribe(state => {
      if (!state.isGuided) {
        this.clearScheduled();
        return;
      }
      
      this.totalDuration = state.duration;

      const preTimerDuration = state.totalDuration - state.duration;
      const meditationElapsed = state.elapsed - preTimerDuration;

      if (state.phase === 'paused') {
          this.clearScheduled();
          if (meditationElapsed > 0) {
              this.currentTime = Math.max(0, meditationElapsed);
          } else {
              this.currentTime = 0;
          }
      } else if (state.phase === 'meditation') {
        this.currentTime = Math.max(0, meditationElapsed);
        this.checkSchedule(this.currentTime, state);
      } else if (state.phase === 'delay' || state.phase === 'bells') {
        this.currentTime = 0;
        this.clearScheduled(); // Ensure no audio plays during pre-timer
      } else { // 'stopped', 'finished'
        this.currentTime = 0;
        this.clearScheduled();
      }
      this.cdr.detectChanges(); // Manually trigger change detection
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

      if (this.isSwitchingMeditation) {
        this.isSwitchingMeditation = false;
      }
    }
  }

  ngOnDestroy(): void {
    if (this.timerSub) {
      this.timerSub.unsubscribe();
      this.timerSub = null;
    }
    if (this.volumeSub) {
      this.volumeSub.unsubscribe();
      this.volumeSub = null;
    }
    this.clearScheduled();
    this.stopNoise();
    if (this.audioCtx) {
      this.audioCtx.close();
      this.audioCtx = null;
    }
  }

  onNext() {
    this.isSwitchingMeditation = true;
    this.timerService.reset();
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

  private clearScheduled() {
    if (this.audio) {
        this.audio.pause();
    }
    if (this.endAudio) {
        this.endAudio.pause();
    }
    this.stopNoise();
  }

  private checkSchedule(elapsed: number, state: TimerState) {
    if (!this.selected || !state.isRunning || state.phase !== 'meditation') {
      this.clearScheduled();
      return;
    }
    
    const overlap = 0.1; 
    const startDur = parseDurationToSeconds(this.selected['start-url-duration'] || this.selected['start_url_duration'] || this.selected.duration || this.selected['duration']);
    const endDur = parseDurationToSeconds(this.selected['end-url-duration'] || this.selected['end_url_duration'] || null) || 0;

    const startAudioEndTime = startDur || 0;
    const endAudioStartTime = state.duration - endDur;

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
        this.playEndUrl(Math.max(0, seekPos));
      }
    }
  }

  private startNoise() {
    if (!this.audioCtx) {
      try {
        this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (e) {
        console.error('Failed to create audio context', e);
        return;
      }
    }

    if (!this.noiseProcessor) {
      this.noiseProcessor = this.audioCtx.createScriptProcessor(4096, 1, 1);
      this.noiseProcessor.onaudioprocess = (e) => {
        const output = e.outputBuffer.getChannelData(0);
        for (let i = 0; i < 4096; i++) {
          output[i] = Math.random() * 2 - 1;
        }
      };
    }

    if (!this.gainNode) {
      this.gainNode = this.audioCtx.createGain();
      this.noiseProcessor.connect(this.gainNode);
      this.gainNode.connect(this.audioCtx.destination);
    }
    
    this.gainNode.gain.setValueAtTime(0.004, this.audioCtx.currentTime);
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
        this.audio.volume = this.currentVolume;
    }
    if (Math.abs(this.audio.currentTime - seekTime) > 1.5) { // Increased tolerance for seeking
        this.audio.currentTime = seekTime;
    }

    if (this.audio.paused) {
      this.audio.play().catch(() => {});
    }
  }

  private playEndUrl(seekTime: number) {
    if (!this.selected) return;
    if (!this.endAudio) {
        this.endAudio = new Audio();
        this.endAudio.src = this.selected['end-url'];
        this.endAudio.volume = this.currentVolume;
    }

    if (Math.abs(this.endAudio.currentTime - seekTime) > 1.5) {
        this.endAudio.currentTime = seekTime;
    }

    if (this.endAudio.paused) {
      this.endAudio.play().catch(() => {});
    }
  }

  togglePlay(): void {
    if (this.timerService.stateSubjectValue.isRunning) {
      this.timerService.pause();
    } else {
      this.timerService.start();
    }
  }

  seek(event: Event): void {
    const target = event.target as HTMLInputElement;
    const time = Number(target.value);
    this.timerService.seek(this.totalDuration - time);
  }

  skip(seconds: number): void {
    const newTime = this.currentTime + seconds;
    const newRemaining = this.totalDuration - newTime;
    this.timerService.seek(Math.max(0, Math.min(this.totalDuration, newRemaining)));
  }

  formatTime(seconds: number): string {
    if (isNaN(seconds) || seconds < 0) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  formatLabel = (value: number): string => {
    return this.formatTime(value);
  }

  private prepareAudio(): void {
    this.clearScheduled();
    if (!this.selected) {
      return;
    }
    this.audioReady = false;
    this.loadError = false;
  
    if (this.selected['start-url']) {
      this.audio = new Audio();
      this.audio.oncanplay = () => this.ngZone.run(() => {
        this.audioReady = true;
        this.cdr.detectChanges();
      });
      this.audio.onerror = () => this.ngZone.run(() => {
        this.loadError = true;
        this.cdr.detectChanges();
      });
      
      this.audio.preload = 'auto';
      this.audio.src = this.selected['start-url'];
      this.audio.volume = this.currentVolume;

      if (this.audio.readyState >= 3) { // HAVE_FUTURE_DATA
        this.ngZone.run(() => {
          this.audioReady = true;
          this.cdr.detectChanges();
        });
      }
    } else {
      this.audioReady = true;
    }
  
    if (this.selected['end-url']) {
      this.endAudio = new Audio();
      this.endAudio.preload = 'auto';
      this.endAudio.src = this.selected['end-url'];
      this.endAudio.volume = this.currentVolume;
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
