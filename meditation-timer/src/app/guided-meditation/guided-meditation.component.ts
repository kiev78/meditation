import { Component, OnDestroy, OnInit, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSliderModule } from '@angular/material/slider';
import { FormsModule } from '@angular/forms';
import { TimerService } from '../timer.service';
import { MEDITATION_TEXT } from './meditation-text';
import { Subscription } from 'rxjs';

interface ScheduledEvent {
  time: number; // Trigger time in seconds (elapsed)
  text: string;
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
  timerService = inject(TimerService);

  private timerSub: Subscription | null = null;
  private schedule: ScheduledEvent[] = [];
  private lastSpokenIndex = -1; // Track which event was last spoken

  // To handle the split-message recursion
  private currentTimeout: any = null;

  constructor() {}

  get isPlaying(): boolean {
    return this.timerService.stateSubjectValue.isRunning;
  }

  get duration(): number {
    return this.timerService.stateSubjectValue.duration;
  }

  get currentTime(): number {
    // Elapsed time = duration - remaining
    return this.duration - this.timerService.stateSubjectValue.remainingTime;
  }

  ngOnInit() {
    this.calculateSchedule();

    this.timerSub = this.timerService.state$.subscribe(state => {
      if (state.isRunning) {
        const elapsed = state.duration - state.remainingTime;
        this.checkSchedule(elapsed);
      } else {
        // Paused
        this.stopSpeaking();
      }

      // Re-calculate if duration changes (and not running to be safe,
      // though changing duration usually happens when stopped)
      if (state.duration !== this.scheduleDurationCache) {
        this.calculateSchedule();
      }
    });
  }

  private scheduleDurationCache = 0;

  ngOnDestroy() {
    this.stopSpeaking();
    if (this.timerSub) {
      this.timerSub.unsubscribe();
    }
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
    const newRem = Math.min(this.duration, currentRem + 10);
    this.timerService.updateState({ remainingTime: newRem });
    this.stopSpeaking(); // Reset speech if we jump
    this.resetSpeechIndex(this.duration - newRem);
  }

  skipForward() {
    const currentRem = this.timerService.stateSubjectValue.remainingTime;
    const newRem = Math.max(0, currentRem - 10);
    this.timerService.updateState({ remainingTime: newRem });
    this.stopSpeaking();
    this.resetSpeechIndex(this.duration - newRem);
  }

  seek(event: Event) {
    const target = event.target as HTMLInputElement;
    const elapsed = Number(target.value);
    const newRem = this.duration - elapsed;
    this.timerService.updateState({ remainingTime: newRem });
    this.stopSpeaking();
    this.resetSpeechIndex(elapsed);
  }

  // --- Scheduler Logic ---

  private calculateSchedule() {
    const duration = this.duration;
    this.scheduleDurationCache = duration;
    this.schedule = [];

    // Parse text
    // We expect sections separated by /intro or /p
    // However, the file is one big string.

    const introMatch = MEDITATION_TEXT.match(/\/intro([\s\S]*?)(?=\/p|$)/);
    const introText = introMatch ? introMatch[1].trim() : '';

    const pokeMatches = [...MEDITATION_TEXT.matchAll(/\/p([\s\S]*?)(?=\/p|$)/g)];
    const pokes = pokeMatches.map(m => m[1].trim());

    // 1. Schedule Intro at T=0
    if (introText) {
      this.schedule.push({ time: 0, text: introText, type: 'intro' });
    }

    // 2. Schedule Pokes
    // Rule: "divide it into a few pokes in first 10m (or active window) and last 5m silence"
    // Active Window:
    let activeWindow = 0;
    if (duration > 600) { // > 10 mins
      activeWindow = duration - 300; // Last 5 mins silence
    } else {
      activeWindow = duration * 0.8; // Use 80% for shorter sessions
    }

    if (pokes.length > 0) {
       // "progressively longer intervals"
       // Start after intro (say 30s buffer?) No, user logic implies gaps.
       // Let's assume we distribute them in the active window.
       // Intervals: x, x+d, x+2d ...
       // Simple approach: Fractions of Active Window.
       // 3 Pokes: 25%, 55%, 90% of Active Window.

       const count = pokes.length;
       for (let i = 0; i < count; i++) {
         let fraction = 0;
         if (count === 1) fraction = 0.5;
         else if (count === 2) fraction = i === 0 ? 0.3 : 0.7;
         else if (count === 3) fraction = i === 0 ? 0.25 : (i === 1 ? 0.55 : 0.9);
         else {
           // Generic distribution
           fraction = (i + 1) / (count + 1);
         }

         const time = Math.floor(activeWindow * fraction);
         // Ensure it doesn't overlap intro too much (intro usually < 30s)
         const safeTime = Math.max(30, time);

         this.schedule.push({ time: safeTime, text: pokes[i], type: 'poke' });
       }
    }

    // Sort schedule just in case
    this.schedule.sort((a, b) => a.time - b.time);
  }

  private resetSpeechIndex(elapsed: number) {
    // If we seek, we should set lastSpokenIndex to the last event that *passed*
    // so we don't replay old stuff immediately, but wait for next.
    // OR should we play the one we jumped onto?
    // Let's assume we wait for the next boundary.
    this.lastSpokenIndex = -1;
    for (let i = 0; i < this.schedule.length; i++) {
      if (this.schedule[i].time <= elapsed) {
        this.lastSpokenIndex = i;
      }
    }
  }

  private checkSchedule(elapsed: number) {
    // We check if we just passed a schedule time
    // Because checking exact second might miss if interval drifts (unlikely with 1s checks),
    // we check: is there an event > lastSpoken and <= elapsed?

    // Actually, simple exact second check usually works if component updates often.
    // But better: Find first event that hasn't been spoken AND is due (time <= elapsed).

    // Note: If we seek forward, resetSpeechIndex handles marking old ones as done.
    // If time ticks naturally:

    const nextIndex = this.lastSpokenIndex + 1;
    if (nextIndex < this.schedule.length) {
      const event = this.schedule[nextIndex];
      // Allow 1s window or check inequality
      if (elapsed >= event.time) {
        this.speakMessage(event.text);
        this.lastSpokenIndex = nextIndex;
      }
    }
  }

  // --- TTS Engine ---

  private stopSpeaking() {
    if (this.currentTimeout) {
      clearTimeout(this.currentTimeout);
      this.currentTimeout = null;
    }
    window.speechSynthesis.cancel();
  }

  private speakMessage(message: string) {
    this.stopSpeaking(); // Cancel any overlapping

    // Parse message for pauses: /5s, /2m
    // Regex to split:
    // We want to keep the delimiters or process them.
    // Let's replace delimiters with a special separator we can split by.
    // Matches: /5s, /10m
    const regex = /(\/\d+[sm])/g;

    // Split: "Hello /5s World" -> ["Hello ", "/5s", " World"]
    const parts = message.split(regex).map(p => p.trim()).filter(p => p.length > 0);

    let currentIndex = 0;

    const speakNext = () => {
      if (currentIndex >= parts.length) return;

      const part = parts[currentIndex];

      // Check if it's a pause command
      const pauseMatch = part.match(/^\/(\d+)([sm])$/);

      if (pauseMatch) {
        const val = parseInt(pauseMatch[1], 10);
        const unit = pauseMatch[2];
        const ms = (unit === 'm' ? val * 60 : val) * 1000;

        // Wait then next
        currentIndex++;
        this.currentTimeout = setTimeout(() => {
          speakNext();
        }, ms);
      } else {
        // Speak text
        // Use the user's "comma split" logic?
        // "use this code sample to loop the text and add pauses"
        // The user provided logic splits by comma. I should integrate that too
        // for micro-pauses within the text block.

        this.speakInternal(part, () => {
          currentIndex++;
          speakNext();
        });
      }
    };

    speakNext();
  }

  private speakInternal(text: string, onComplete: () => void) {
    if (!text) {
      onComplete();
      return;
    }

    // User's comma logic:
    const subParts = text.split(',');
    let subIndex = 0;

    const speakSub = () => {
      if (subIndex >= subParts.length) {
        onComplete();
        return;
      }

      const subText = subParts[subIndex].trim();
      if (!subText) {
        subIndex++;
        speakSub();
        return;
      }

      const msg = new SpeechSynthesisUtterance();
      const voices = window.speechSynthesis.getVoices();
      // Try to pick a nice voice? Default is usually [0].
      msg.voice = voices[0];
      msg.volume = 1;
      msg.rate = 1;
      msg.pitch = 1; // Default pitch
      msg.text = subText;
      msg.lang = 'en-US';

      msg.onend = () => {
        subIndex++;
        if (subIndex < subParts.length) {
           this.currentTimeout = setTimeout(() => {
             speakSub();
           }, 500); // 500ms pause for commas
        } else {
          onComplete();
        }
      };

      msg.onerror = (e) => {
          console.error('TTS Error', e);
          onComplete(); // Skip on error
      };

      window.speechSynthesis.speak(msg);
    };

    speakSub();
  }

  // --- UI Helpers ---

  formatTime(seconds: number): string {
    if (!seconds && seconds !== 0) return '00:00';
    seconds = Math.max(0, Math.floor(seconds)); // Ensure positive
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  formatLabel = (value: number): string => {
    return this.formatTime(value);
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    // Only handle if this component is active/visible?
    // The Container conditionally renders this, so @HostListener should be fine.

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
