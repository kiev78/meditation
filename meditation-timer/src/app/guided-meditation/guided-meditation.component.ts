import { Component, OnDestroy, OnInit, HostListener, inject } from '@angular/core';
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

// New Interfaces for the structured JSON
interface MeditationPart {
  say?: string;
  pause?: number;
}

interface MeditationSection {
  type: 'intro' | 'poke';
  content: MeditationPart[];
}

interface ScheduledEvent {
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
  timerService = inject(TimerService);
  private http = inject(HttpClient);
  bellService = inject(BellService);

  private timerSub: Subscription | null = null;
  private schedule: ScheduledEvent[] = [];
  private lastSpokenIndex = -1;
  private meditationScript: MeditationSection[] = [];

  private currentTimeout: any = null;

  constructor() {}

  get isPlaying(): boolean {
    return this.timerService.stateSubjectValue.isRunning;
  }

  get duration(): number {
    return this.timerService.stateSubjectValue.duration;
  }

  get currentTime(): number {
    return this.duration - this.timerService.stateSubjectValue.remainingTime;
  }

  ngOnInit() {
    this.http.get<MeditationSection[]>('meditation/meditation-text.json')
      .pipe(take(1))
      .subscribe(data => {
        this.meditationScript = data;
        this.calculateSchedule();

        if (this.timerSub) {
          this.timerSub.unsubscribe();
        }

        this.timerSub = this.timerService.state$.subscribe(state => {
          if (state.isRunning) {
            const elapsed = state.duration - state.remainingTime;
            this.checkSchedule(elapsed);
          } else {
            this.stopSpeaking();
          }

          if (state.duration !== this.scheduleDurationCache) {
            this.calculateSchedule();
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

  togglePlay() {
    if (this.isPlaying) {
      this.timerService.pause();
    } else {
      this.bellService.playBell();
      //wait 10 seconds before starting timer to allow bell to play
      setTimeout(() => {
      this.timerService.start();
      }, 10000);  
    }
  }

  skipBack() {
    const currentRem = this.timerService.stateSubjectValue.remainingTime;
    const newRem = Math.min(this.duration, currentRem + 10);
    this.timerService.updateState({ remainingTime: newRem });
    this.stopSpeaking();
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
    
    let activeWindow = 0;
    if (duration > 600) { // > 10 mins
      activeWindow = duration - 300; // Last 5 mins silence
    } else {
      activeWindow = duration * 0.8; // Use 80% for shorter sessions
    }

    if (pokes.length > 0) {
       const count = pokes.length;
       for (let i = 0; i < count; i++) {
         let fraction = 0;
         if (count === 1) fraction = 0.5;
         else if (count === 2) fraction = i === 0 ? 0.3 : 0.7;
         else if (count === 3) fraction = i === 0 ? 0.25 : (i === 1 ? 0.55 : 0.9);
         else {
           fraction = (i + 1) / (count + 1);
         }

         const time = Math.floor(activeWindow * fraction);
         const safeTime = Math.max(30, time);

         this.schedule.push({ time: safeTime, content: pokes[i].content, type: 'poke' });
       }
    }

    this.schedule.sort((a, b) => a.time - b.time);
  }

  private resetSpeechIndex(elapsed: number) {
    this.lastSpokenIndex = -1;
    for (let i = 0; i < this.schedule.length; i++) {
      if (this.schedule[i].time <= elapsed) {
        this.lastSpokenIndex = i;
      }
    }
  }

  private checkSchedule(elapsed: number) {
    const nextIndex = this.lastSpokenIndex + 1;
    if (nextIndex < this.schedule.length) {
      const event = this.schedule[nextIndex];
      if (elapsed >= event.time) {
        this.speakMessage(event.content);
        this.lastSpokenIndex = nextIndex;
      }
    }
  }

  private stopSpeaking() {
    if (this.currentTimeout) {
      clearTimeout(this.currentTimeout);
      this.currentTimeout = null;
    }
    window.speechSynthesis.cancel();
  }

  private speakMessage(parts: MeditationPart[]) {
    this.stopSpeaking();

    let currentIndex = 0;

    const speakNext = () => {
      if (currentIndex >= parts.length) return;

      const part = parts[currentIndex];

      if (part.pause) {
        const ms = part.pause * 1000;
        this.currentTimeout = setTimeout(() => {
          currentIndex++;
          speakNext();
        }, ms);
      } else if (part.say) {
        this.speakInternal(part.say, () => {
          currentIndex++;
          speakNext();
        });
      } else {
        currentIndex++;
        speakNext();
      }
    };

    speakNext();
  }

  private speakInternal(text: string, onComplete: () => void) {
    if (!text) {
      onComplete();
      return;
    }

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
      msg.voice = this.setVoice();
      msg.volume = 1;
      msg.rate = 0.9;
      msg.pitch = 0.5;
      msg.text = subText;
      msg.lang = 'en-US';

      msg.onend = () => {
        subIndex++;
        if (subIndex < subParts.length) {
           this.currentTimeout = setTimeout(() => {
             speakSub();
           }, 500);
        } else {
          onComplete();
        }
      };

      msg.onerror = (e) => {
          console.error('TTS Error', e);
          onComplete();
      };

      window.speechSynthesis.speak(msg);
    };

    speakSub();
  }

  private setVoice() {
    const voices = window.speechSynthesis.getVoices();
    // Prefer "Microsoft Brian" as requested, with fallbacks.
    var voice = voices.find(v => v.name.includes('Brian')) ||
                 voices.find(v => v.lang.startsWith('en-US')) ||
                 voices[0];
     return voice;
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
