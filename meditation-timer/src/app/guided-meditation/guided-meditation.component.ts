import { Component, OnDestroy, OnInit, HostListener, inject, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSliderModule } from '@angular/material/slider';
import { FormsModule } from '@angular/forms';
import { TimerService } from '../timer.service';
import { BellService } from '../bell.service';
import { Subscription } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { take } from 'rxjs/operators';
import { MeditationCacheService, MeditationCache } from '../meditation-cache.service';

// New Interfaces for the structured JSON
interface MeditationPart {
  // `say` can be a plain string or an array of word objects allowing per-word rate/pitch.
  say?: string | Array<{ text: string; rate?: number; pitch?: number }>;
  pause?: number;
  // Optional overrides that apply to the whole part when `say` is a string or when words don't specify overrides.
  rate?: number;
  pitch?: number;
}

interface MeditationSection {
  type: 'intro' | 'poke';
  content: MeditationPart[];
}

export interface ScheduledEvent {
  time: number; // Trigger time in seconds (elapsed)
  content: MeditationPart[]; // The content to be spoken
  type: 'intro' | 'poke';
}

@Component({
  selector: 'app-guided-meditation',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatSliderModule, FormsModule],
  templateUrl: './guided-meditation.html',
  styleUrls: ['./guided-meditation.css']
})
export class GuidedMeditationComponent implements OnInit, OnDestroy {
  public timerService = inject(TimerService);
  private http = inject(HttpClient);
  bellService = inject(BellService);
  private cacheService = inject(MeditationCacheService);
  @Output() next = new EventEmitter<void>();

  private timerSub: Subscription | null = null;
  private schedule: ScheduledEvent[] = [];
  private lastSpokenIndex = -1;
  private meditationScript: MeditationSection[] = [];

  private currentTimeout: any = null;

  // Speech settings
  voice: SpeechSynthesisVoice | null = null;
  rate = 0.8;
  pitch = 0.4;

  constructor() {}

  get isPlaying(): boolean {
    return this.timerService.stateSubjectValue.isRunning;
  }

  get duration(): number {
    return this.timerService.stateSubjectValue.duration;
  }

  get currentTime(): number {
    const rem = this.timerService.stateSubjectValue.remainingTime;
    // During start delay (negative remainingTime) or invalid state, return 0.
    if (rem < 0 || rem > this.duration) {
      return 0;
    }
    return this.duration - rem;
  }

  ngOnInit() {
    // Accept either an array payload or an object payload that may include rate/pitch
    this.http.get<any>('meditation/meditation-text.json')
      .pipe(take(1))
      .subscribe(data => {
        const payload = data as any;

        // Allow the JSON to be either an array of sections or an object with a `sections`/`script` array.
        if (Array.isArray(payload)) {
          this.meditationScript = payload;
        } else if (Array.isArray(payload.sections)) {
          this.meditationScript = payload.sections;
        } else if (Array.isArray(payload.script)) {
          this.meditationScript = payload.script;
        } else {
          this.meditationScript = [];
        }

        // If JSON includes top-level rate/pitch settings, allow them to override defaults.
        if (payload && payload.rate !== undefined) {
          const r = Number(payload.rate);
          if (!Number.isNaN(r)) this.rate = r;
        }
        if (payload && payload.pitch !== undefined) {
          const p = Number(payload.pitch);
          if (!Number.isNaN(p)) this.pitch = p;
        }

        this.calculateSchedule();
        this.initVoiceAndLoadCache();

        if (this.timerSub) {
          this.timerSub.unsubscribe();
        }

        this.timerSub = this.timerService.state$.subscribe(state => {
          if (state.isRunning) {
            // Check for bell sequence
            if (state.isBellSequenceRunning) {
               // Ensure we are not speaking while bells ring
               this.stopSpeaking();
               return;
            }

            // Using this.currentTime ensures we handle start delays (negative remainingTime) correctly.
            // If remainingTime < 0, currentTime returns 0.
            const elapsed = this.currentTime;
            this.checkSchedule(elapsed);
          } else {
            this.stopSpeaking();
          }

          if (state.duration !== this.scheduleDurationCache) {
            this.calculateSchedule();
            this.initVoiceAndLoadCache(); // Reload cache if duration changes
          }
        });
      });
  }

  private scheduleDurationCache = 0;

  ngOnDestroy() {
    this.stopSpeaking();
    if (this.timerSub) {
      this.timerSub.unsubscribe();
    }
  }

  onNext() {
    this.next.emit();
  }

  togglePlay() {
    if (this.isPlaying) {
      this.timerService.pause();
    } else {
      this.timerService.start();
    }
  }

  skipBack() {
    const currentRem = this.timerService.stateSubjectValue.remainingTime;
    // If we are in delay phase (<0), skipping back doesn't make sense or should extend delay?
    // Let's assume we just clamp to duration.
    const newRem = Math.min(this.duration, currentRem + 10);
    this.timerService.seek(newRem);

    // We need to calculate the new elapsed time to reset speech index correctly.
    // If newRem is negative (still in delay), elapsed is 0.
    const elapsed = (newRem < 0) ? 0 : (this.duration - newRem);
    this.resumeFromTime(elapsed);
  }

  skipForward() {
    const currentRem = this.timerService.stateSubjectValue.remainingTime;
    const newRem = Math.max(0, currentRem - 10);
    this.timerService.seek(newRem);

    const elapsed = (newRem < 0) ? 0 : (this.duration - newRem);
    this.resumeFromTime(elapsed);
  }

  seek(event: Event) {
    const target = event.target as HTMLInputElement;
    const elapsed = Number(target.value);
    const newRem = this.duration - elapsed;
    this.timerService.seek(newRem);
    this.resumeFromTime(elapsed);
  }

  private calculateSchedule() {
    const duration = this.duration;
    this.scheduleDurationCache = duration;
    this.schedule = [];

    if (!this.meditationScript || this.meditationScript.length === 0) {
      return;
    }

    const intro = this.meditationScript.find(s => s.type === 'intro');
    if (intro) {
      this.schedule.push({ time: 0, content: intro.content, type: 'intro' });
    }

    const pokes = this.meditationScript.filter(s => s.type === 'poke');
    const count = pokes.length;

    const POKE_1_TIME = 120; // 2 minutes
    const POKE_2_TIME = 264; // 4.4 minutes

    const activeWindowEnd = duration - 300; // 5 minutes of silence at the end

    if (count > 0 && POKE_1_TIME < activeWindowEnd) {
      this.schedule.push({ time: POKE_1_TIME, content: pokes[0].content, type: 'poke' });
    }
    if (count > 1 && POKE_2_TIME < activeWindowEnd) {
      this.schedule.push({ time: POKE_2_TIME, content: pokes[1].content, type: 'poke' });
    }

    if (count > 2 && duration > 600) { // Only schedule more pokes if duration is > 10 mins
      const remainingPokes = pokes.slice(2);
      const remainingCount = remainingPokes.length;

      const remainingWindowStart = POKE_2_TIME + 1;
      const remainingWindowDuration = activeWindowEnd - remainingWindowStart;

      if (remainingWindowDuration > 0) {
        for (let i = 0; i < remainingCount; i++) {
          const fraction = (i + 1) / (remainingCount + 1);
          const time = remainingWindowStart + Math.floor(remainingWindowDuration * fraction);
          
          if (time < activeWindowEnd) {
            this.schedule.push({ time: time, content: remainingPokes[i].content, type: 'poke' });
          }
        }
      }
    }

    this.schedule.sort((a, b) => a.time - b.time);
  }

  private initVoiceAndLoadCache() {
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) {
      // Voices not loaded yet, try again.
      setTimeout(() => this.initVoiceAndLoadCache(), 100);
      return;
    }
    // Prefer "Microsoft Brian" as requested, with fallbacks.
    this.voice = voices.find(v => v.name.includes('Brian')) ||
                 voices.find(v => v.lang.startsWith('en-US')) ||
                 voices[0];
    
    this.loadFromCache();
  }

  private loadFromCache() {
    const cachedData = this.cacheService.load(
      this.duration,
      this.voice?.name || 'default',
      this.rate,
      this.pitch
    );

    if (cachedData && cachedData.wordTimings) {
      this.wordTimings = new Map(cachedData.wordTimings);
    } else {
      this.wordTimings = new Map();
    }
  }

  private activeScheduleIndex: number | null = null;
  private wordTimings: Map<number, { charIndex: number, time: number }[]> = new Map();

  private resumeFromTime(elapsed: number) {
    this.stopSpeaking();
    // With bell sequence separated in timer, elapsed is 0-based from start of countdown
    const effectiveElapsed = elapsed;

    if (effectiveElapsed < 0) {
      this.lastSpokenIndex = -1;
      return;
    }

    let scheduleIndex = -1;
    for (let i = 0; i < this.schedule.length; i++) {
      if (this.schedule[i].time <= effectiveElapsed) {
        scheduleIndex = i;
      } else {
        break;
      }
    }

    if (scheduleIndex === -1) {
      this.lastSpokenIndex = -1;
      return;
    }

    const timings = this.wordTimings.get(scheduleIndex);
    if (timings) {
      // Precision seeking is possible
      let charIndex = 0;
      for (const timing of timings) {
        if (timing.time <= effectiveElapsed) {
          charIndex = timing.charIndex;
        } else {
          break;
        }
      }
      this.lastSpokenIndex = scheduleIndex - 1;
      this.speakMessage(this.schedule[scheduleIndex].content, scheduleIndex, charIndex);

    } else {
      // No timings yet, seek to silence before this segment
      this.lastSpokenIndex = scheduleIndex;
    }
  }

  private checkSchedule(elapsed: number) {
    if (this.activeScheduleIndex !== null) {
      return; // Already speaking
    }
    // With bell sequence separated in timer, elapsed is 0-based from start of countdown
    const effectiveElapsed = elapsed;

    if (effectiveElapsed < 0) {
      return;
    }

    const nextIndex = this.lastSpokenIndex + 1;
    if (nextIndex < this.schedule.length) {
      const event = this.schedule[nextIndex];
      if (effectiveElapsed >= event.time) {
        this.speakMessage(event.content, nextIndex);
        this.lastSpokenIndex = nextIndex;
      }
    }
  }

  private stopSpeaking() {
    if (this.currentTimeout) {
      clearTimeout(this.currentTimeout);
      this.currentTimeout = null;
    }
    this.activeScheduleIndex = null;
    window.speechSynthesis.cancel();
  }

  private speakMessage(parts: MeditationPart[], scheduleIndex: number, startCharIndex = 0) {
    this.stopSpeaking();
    this.activeScheduleIndex = scheduleIndex;

    let partIndex = 0;
    let charIndex = startCharIndex;

    const speakNext = () => {
      if (partIndex >= parts.length) {
        this.activeScheduleIndex = null;
        return;
      }

      const part = parts[partIndex];

      if (part.pause) {
        const ms = part.pause * 1000;
        this.currentTimeout = setTimeout(() => {
          partIndex++;
          speakNext();
        }, ms);
      } else if (part.say) {
        // Two supported shapes for `say`:
        // 1) string: a simple block of text (part-level `rate`/`pitch` may apply)
        // 2) array of { text, rate?, pitch? } to allow per-word rate/pitch
        if (typeof part.say === 'string') {
          const fullText = part.say as string;
          const textToSay = fullText.substring(charIndex);
          const baseCharIndex = charIndex;
          const rateOverride = part.rate;
          const pitchOverride = part.pitch;
          charIndex = 0; // Reset for next part

          this.speakInternal(textToSay, scheduleIndex, baseCharIndex, () => {
            partIndex++;
            speakNext();
          }, rateOverride, pitchOverride);
        } else if (Array.isArray(part.say)) {
          const words = part.say as Array<{ text: string; rate?: number; pitch?: number }>;
          const wordStarts: number[] = [];
          let cursor = 0;
          for (let i = 0; i < words.length; i++) {
            wordStarts.push(cursor);
            cursor += words[i].text.length + (i < words.length - 1 ? 1 : 0);
          }

          const fullText = words.map(w => w.text).join(' ');

          // Find starting word index and offset within that word based on charIndex
          let startWord = 0;
          for (let i = 0; i < wordStarts.length; i++) {
            const start = wordStarts[i];
            const end = (i + 1 < wordStarts.length) ? wordStarts[i + 1] - 1 : fullText.length;
            if (charIndex >= start && charIndex <= end) {
              startWord = i;
              break;
            }
            if (i === wordStarts.length - 1 && charIndex > end) startWord = i;
          }

          let speakWordIndex = startWord;
          let innerOffset = Math.max(0, charIndex - wordStarts[speakWordIndex]);

          const speakWordsGroup = () => {
            if (speakWordIndex >= words.length) {
              partIndex++;
              speakNext();
              return;
            }

            // Group consecutive words that share rate/pitch (falling back to part-level then defaults)
            const groupRate = words[speakWordIndex].rate !== undefined ? words[speakWordIndex].rate : part.rate;
            const groupPitch = words[speakWordIndex].pitch !== undefined ? words[speakWordIndex].pitch : part.pitch;

            let j = speakWordIndex;
            let groupText = words[j].text;
            while (j + 1 < words.length) {
              const nextRate = words[j + 1].rate !== undefined ? words[j + 1].rate : part.rate;
              const nextPitch = words[j + 1].pitch !== undefined ? words[j + 1].pitch : part.pitch;
              if (nextRate === groupRate && nextPitch === groupPitch) {
                groupText += ' ' + words[j + 1].text;
                j++;
              } else {
                break;
              }
            }

            const groupBaseCharIndex = wordStarts[speakWordIndex];
            const utterText = groupText.substring(innerOffset);

            // After first utterance in a part, subsequent groups start at 0 offset
            innerOffset = 0;

            this.speakInternal(utterText, scheduleIndex, groupBaseCharIndex + (groupBaseCharIndex === undefined ? 0 : 0), () => {
              speakWordIndex = j + 1;
              speakWordsGroup();
            }, groupRate, groupPitch);
          };

          speakWordsGroup();
        } else {
          // Unknown shape, skip
          partIndex++;
          speakNext();
        }
      } else {
        // Should not happen, but good to handle
        partIndex++;
        speakNext();
      }
    };

    speakNext();
  }

  private speakInternal(
    text: string,
    scheduleIndex: number,
    baseCharIndex: number,
    onComplete: () => void,
    rateOverride?: number,
    pitchOverride?: number
  ) {
    if (!text) {
      onComplete();
      return;
    }

    const msg = new SpeechSynthesisUtterance(text);
    msg.voice = this.voice;
    msg.volume = 1;
    msg.rate = (rateOverride !== undefined) ? rateOverride : this.rate;
    msg.pitch = (pitchOverride !== undefined) ? pitchOverride : this.pitch;
    msg.lang = 'en-US';

    const localTimings: { charIndex: number, time: number }[] = [];

    msg.onboundary = (e) => {
      if (e.name === 'word') {
        const originalCharIndex = baseCharIndex + e.charIndex;
        localTimings.push({
          charIndex: originalCharIndex,
          time: this.currentTime,
        });
      }
    };

    msg.onend = () => {
      // On seek, we might have partial timings. Merge them carefully.
      const existingTimings = this.wordTimings.get(scheduleIndex) || [];
      const mergedTimings = [...existingTimings];
      
      // Add only new timings
      localTimings.forEach(lt => {
        if (!mergedTimings.some(et => et.charIndex === lt.charIndex)) {
          mergedTimings.push(lt);
        }
      });

      // Keep it sorted
      mergedTimings.sort((a,b) => a.charIndex - b.charIndex);
      this.wordTimings.set(scheduleIndex, mergedTimings);

      // Save to cache
      this.cacheService.save(
        this.duration,
        this.voice?.name || 'default',
        this.rate,
        this.pitch,
        { wordTimings: Array.from(this.wordTimings.entries()) }
      );

      onComplete();
    };

    msg.onerror = (e) => {
        console.error('TTS Error', e);
        onComplete();
    };

    window.speechSynthesis.speak(msg);
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

  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (event.key === ' ') {
      event.preventDefault();
      this.togglePlay();
    } else if (event.key === 'ArrowLeft') {
      this.skipBack();
    } else if (event.key === 'ArrowRight') {
      this.skipForward();
    }
  }
}
