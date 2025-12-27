import { Component, OnDestroy, OnInit, HostListener, inject, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';
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
import { TimerState } from '../timer-state.interface';

// Interfaces for the structured JSON
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
  private cacheService = inject(MeditationCacheService);
  private cdr = inject(ChangeDetectorRef);
  @Output() next = new EventEmitter<void>();

  private timerSub: Subscription | null = null;
  private volumeSub: Subscription | null = null;
  private schedule: ScheduledEvent[] = [];
  private lastSpokenIndex = -1;
  private meditationScript: MeditationSection[] = [];
  private previousState: TimerState | null = null;
  private isSeeking = false; // Prevent state changes during seek

  // Properties for managing custom timeouts for speech pauses
  private isVoiceReady = false;
  private currentTimeout: any = null; // Can be NodeJS.Timeout, but any is safer for browser vs. node
  private timeoutStartTime: number | null = null;
  private pausedTimeoutInfo: { callback: () => void; remaining: number } | null = null;
  private isGloballyPaused = false;

  // Speech settings
  voice: SpeechSynthesisVoice | null = null;
  rate = 0.8;
  pitch = 0.4;
  currentVolume = 1;

  public teacher: string = '';
  public title: string = '';
  
  // UI properties
  currentTime = 0; // Elapsed time for the meditation phase specifically
  
  get duration(): number {
    // The meditation duration from the service
    return this.timerService.stateSubjectValue.duration;
  }
  
  get isPlaying(): boolean {
    return this.timerService.stateSubjectValue.isRunning;
  }

  public bellService = inject(BellService);

  constructor() {}

  ngOnInit() {
    this.volumeSub = this.bellService.volume$.subscribe(vol => {
      this.currentVolume = vol;
    });

    this.timerService.updateState({ isGuided: true });
    
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
        if (payload?.rate !== undefined) this.rate = Number(payload.rate);
        if (payload?.pitch !== undefined) this.pitch = Number(payload.pitch);
        if (payload?.teacher) this.teacher = payload.teacher;
        if (payload?.title) this.title = payload.title;
        
        this.cdr.markForCheck();

        this.calculateSchedule();
        this.initVoiceAndLoadCache();

        // Clear any stale timings from the cache to ensure they are fresh for this session.
        // This effectively disables the cross-session timing cache but prevents corruption
        // if the underlying meditation script has changed.
        this.wordTimings = new Map();

        if (this.timerSub) this.timerSub.unsubscribe();

        this.timerSub = this.timerService.state$.subscribe(state => {
          this.handleStateChange(state);
        });
      });
  }

  private handleStateChange(state: TimerState) {
    if (this.isSeeking) {
      return;
    }

    if (!state.isGuided) {
      this.stopSpeaking();
      this.previousState = state;
      return;
    }

    const preTimerDuration = state.totalDuration - state.duration;
    const meditationElapsed = state.elapsed - preTimerDuration;
    this.currentTime = Math.max(0, meditationElapsed);

    const justResumed = this.previousState?.phase === 'paused' && state.phase === 'meditation';
    const justPaused = this.previousState?.phase !== 'paused' && state.phase === 'paused';
    const phaseChanged = this.previousState?.phase !== state.phase;

    if (justPaused) {
      this.pauseSpeaking();
    } else if (justResumed) {
      this.resumeSpeaking();
    } else if (state.phase === 'meditation') {
      this.checkSchedule(this.currentTime);
    } else if (phaseChanged && (state.phase === 'delay' || state.phase === 'bells' || state.phase === 'stopped' || state.phase === 'finished')) {
      this.currentTime = 0;
      this.stopSpeaking();
      this.lastSpokenIndex = -1;
    }

    // Check if the duration from settings has changed, and if so, recalc schedule
    if (state.duration !== this.scheduleDurationCache) {
      this.calculateSchedule();
      this.initVoiceAndLoadCache();
    }
    
    this.previousState = state;
    this.cdr.detectChanges(); // Manually trigger change detection
  }

  private scheduleDurationCache = 0;

  ngOnDestroy() {
    this.stopSpeaking();
    if (this.timerSub) {
      this.timerSub.unsubscribe();
    }
    if (this.volumeSub) {
      this.volumeSub.unsubscribe();
    }
  }

  onNext() {
    this.timerService.reset();
    this.next.emit();
  }

  togglePlay(event?: Event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (this.isPlaying) {
      this.timerService.pause();
    } else {
      // Prime the speech synthesis engine on user interaction
      const primer = new SpeechSynthesisUtterance(' ');
      primer.volume = 0;
      window.speechSynthesis.speak(primer);

      this.timerService.start();
    }
  }

  skipBack() {
    this.skip(-15);
  }

  skipForward() {
    this.skip(15);
  }

  skip(seconds: number): void {
    const newTime = this.currentTime + seconds;
    const newRemaining = this.duration - newTime;
    this.timerService.seek(Math.max(0, Math.min(this.duration, newRemaining)));
  }

  seek(event: Event) {
    this.isSeeking = true;
    const target = event.target as HTMLInputElement;
    const elapsed = Number(target.value);
    const newRem = this.duration - elapsed;

    this.timerService.seek(newRem);
    this.resumeFromTime(elapsed);

    // Let state changes from seek propagate, then reset flag
    setTimeout(() => {
      this.isSeeking = false;
    }, 250);
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
    const setVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      if (!voices.length) {
        return false;
      }

      // Prefer "Microsoft Brian" as requested, with fallbacks.
      this.voice = voices.find(v => v.name.includes('Brian')) ||
                   voices.find(v => v.lang.startsWith('en-US')) ||
                   voices[0];

      this.isVoiceReady = true; // Voice is ready
      this.loadFromCache();
      return true;
    };

    if (!setVoice()) {
      window.speechSynthesis.onvoiceschanged = () => {
        setVoice();
      };
    }
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
    if (elapsed < 0) {
      this.lastSpokenIndex = -1;
      return;
    }

    let scheduleIndex = -1;
    for (let i = 0; i < this.schedule.length; i++) {
      if (this.schedule[i].time <= elapsed) {
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
        if (timing.time <= elapsed) {
          charIndex = timing.charIndex;
        } else {
          break;
        }
      }
      this.lastSpokenIndex = scheduleIndex;
      this.speakMessage(this.schedule[scheduleIndex].content, scheduleIndex, charIndex);

    } else {
      // No timings yet, seek to silence before this segment
      this.lastSpokenIndex = scheduleIndex;
    }
  }

  private checkSchedule(elapsed: number) {
    if (this.activeScheduleIndex !== null || !this.isVoiceReady) return;
    if (elapsed < 0) return;

    const nextIndex = this.lastSpokenIndex + 1;
    if (nextIndex < this.schedule.length) {
      const event = this.schedule[nextIndex];
      if (elapsed >= event.time) {
        this.speakMessage(event.content, nextIndex);
        this.lastSpokenIndex = nextIndex;
      }
    }
  }

  private pauseSpeaking() {
    this.isGloballyPaused = true;
    // If a setTimeout is active for a meditation pause
    if (this.currentTimeout && this.timeoutStartTime && this.pausedTimeoutInfo) {
      const elapsed = Date.now() - this.timeoutStartTime;
      const remaining = this.pausedTimeoutInfo.remaining - elapsed;
      clearTimeout(this.currentTimeout);
      this.currentTimeout = null;
      this.timeoutStartTime = null;
      // Update remaining time on the stored info
      this.pausedTimeoutInfo.remaining = remaining > 0 ? remaining : 0;
    }
    // If speech is active
    if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
      window.speechSynthesis.pause();
    }
  }

  private resumeSpeaking() {
    this.isGloballyPaused = false;

    // Case 1: We were in a scripted, silent pause. Resume the countdown.
    if (this.pausedTimeoutInfo && !this.currentTimeout) {
      const callback = this.pausedTimeoutInfo.callback;
      const remaining = this.pausedTimeoutInfo.remaining;
      if (remaining > 0) {
        this.currentTimeout = setTimeout(callback, remaining);
        this.timeoutStartTime = Date.now();
      } else {
        // Timeout had already finished, just run the callback to continue the script
        callback();
      }
    }
    // Case 2: An utterance was actively paused. Resume it.
    else if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
    // Case 3: Defensive recovery. The synth is in a broken or unexpected state.
    else {
      // This can happen if pause() implicitly cancels the utterance, or if the browser
      // leaves it in a state of { speaking: true, paused: false }.
      // The safest recovery is to stop everything and restart from the current time.
      this.resumeFromTime(this.currentTime);
    }
  }

  private stopSpeaking() {
    this.isGloballyPaused = false;
    if (this.currentTimeout) {
      clearTimeout(this.currentTimeout);
      this.currentTimeout = null;
    }
    this.activeScheduleIndex = null;
    if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }
    
    // Also reset pause state
    this.pausedTimeoutInfo = null;
    this.timeoutStartTime = null;
  }

  private speakMessage(parts: MeditationPart[], scheduleIndex: number, startCharIndex = 0) {
    this.stopSpeaking();
    this.activeScheduleIndex = scheduleIndex;

    let partIndex = 0;
    let charIndexInPart = startCharIndex;
    let absoluteCharIndexOffset = 0;

    // This function processes the script recursively. Before it starts,
    // we fast-forward to the correct part and character offset based on startCharIndex.
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      let partLength = 0;
      if (part.say) {
        partLength = (typeof part.say === 'string')
          ? part.say.length
          : (part.say as Array<{text: string}>).map(w => w.text).join(' ').length;
      }
      
      if (charIndexInPart >= partLength) {
        // The seek position is beyond this part, so skip it.
        charIndexInPart -= partLength;
        absoluteCharIndexOffset += partLength;
        partIndex = i + 1; // Start the speaker at the next part.
      } else {
        // The seek position is within this part. Stop fast-forwarding.
        break;
      }
    }

    const speakNext = () => {
      if (this.isGloballyPaused) { return; }
      if (partIndex >= parts.length) {
        this.activeScheduleIndex = null;
        return;
      }

      const part = parts[partIndex];

      if (part.pause) {
        const ms = part.pause * 1000;
        const callback = () => { 
          if (this.isGloballyPaused) { return; }
          this.currentTimeout = null;
          this.timeoutStartTime = null;
          this.pausedTimeoutInfo = null;
          partIndex++;
          speakNext();
        };
        this.currentTimeout = setTimeout(callback, ms);
        this.timeoutStartTime = Date.now();
        this.pausedTimeoutInfo = { callback, remaining: ms };
      } else if (part.say) {
        this.pausedTimeoutInfo = null;

        if (typeof part.say === 'string') {
          const partLength = part.say.length;
          const textToSay = part.say.substring(charIndexInPart);
          const baseCharIndex = absoluteCharIndexOffset + charIndexInPart;
          charIndexInPart = 0; // Reset for subsequent parts.

          this.speakInternal(textToSay, scheduleIndex, baseCharIndex, () => {
            if (this.isGloballyPaused) { return; }
            absoluteCharIndexOffset += partLength;
            partIndex++;
            speakNext();
          }, part.rate, part.pitch);

        } else if (Array.isArray(part.say)) {
          const words = part.say as Array<{ text: string; rate?: number; pitch?: number }>;
          const wordStarts: number[] = [];
          let cursor = 0;
          for (let i = 0; i < words.length; i++) {
            wordStarts.push(cursor);
            cursor += words[i].text.length + (i < words.length - 1 ? 1 : 0);
          }

          let startWord = 0;
          for (let i = 0; i < wordStarts.length; i++) {
            if (charIndexInPart >= wordStarts[i]) {
              startWord = i;
            } else {
              break;
            }
          }

          let speakWordIndex = startWord;
          let innerOffset = Math.max(0, charIndexInPart - wordStarts[speakWordIndex]);
          charIndexInPart = 0; // Reset for subsequent parts.

          const speakWordsGroup = () => {
            if (this.isGloballyPaused) { return; }
            if (speakWordIndex >= words.length) {
              absoluteCharIndexOffset += cursor;
              partIndex++;
              speakNext();
              return;
            }

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

            const groupBaseCharIndex = absoluteCharIndexOffset + wordStarts[speakWordIndex];
            const utterText = groupText.substring(innerOffset);
            innerOffset = 0;

            this.speakInternal(utterText, scheduleIndex, groupBaseCharIndex, () => {
              if (this.isGloballyPaused) { return; }
              speakWordIndex = j + 1;
              speakWordsGroup();
            }, groupRate, groupPitch);
          };

          speakWordsGroup();
        } else {
          partIndex++;
          speakNext();
        }
      } else {
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

    // Capture the timer's current time just before we ask the engine to speak.
    // This provides a baseline for the high-precision elapsedTime from the boundary event.
    const utteranceStartTime = this.currentTime;

    const msg = new SpeechSynthesisUtterance(text);
    msg.voice = this.voice;
    msg.volume = this.currentVolume;
    msg.rate = (rateOverride !== undefined) ? rateOverride : this.rate;
    msg.pitch = (pitchOverride !== undefined) ? pitchOverride : this.pitch;
    msg.lang = 'en-US';

    const localTimings: { charIndex: number, time: number }[] = [];

    msg.onboundary = (e) => {
      if (e.name === 'word') {
        const originalCharIndex = baseCharIndex + e.charIndex;
        // The event's elapsedTime is high-precision (milliseconds) from the start of the utterance.
        // Add it to our utterance start time to get a precise timestamp for the word boundary.
        const preciseTime = utteranceStartTime + (e.elapsedTime / 1000.0);
        localTimings.push({
          charIndex: originalCharIndex,
          time: preciseTime,
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
      // DEFENSIVE: When we force a restart, the previous utterance is 'interrupted'.
      // We must NOT call onComplete() for this error, as it would cause a race condition
      // where the old, cancelled audio chain tries to start a new utterance, causing overlapping audio.
      if (e.error === 'interrupted') {
        // Do nothing. The new audio chain is already taking over.
      } else {
        console.error('TTS Error', e);
        onComplete(); // For other errors, we still try to continue.
      }
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
}