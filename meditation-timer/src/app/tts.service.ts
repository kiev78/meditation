import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TtsService {
  private synth: SpeechSynthesis;
  private voices: SpeechSynthesisVoice[] = [];
  
  private speakingSub = new BehaviorSubject<boolean>(false);
  public speaking$ = this.speakingSub.asObservable();

  constructor(private zone: NgZone) {
    this.synth = window.speechSynthesis;
    this.populateVoiceList();
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = this.populateVoiceList.bind(this);
    }
  }

  private populateVoiceList() {
    this.voices = this.synth.getVoices();
  }

  speak(text: string): void {
    if (this.synth.speaking) {
      this.synth.cancel();
      setTimeout(() => this.speak(text), 100);
      return;
    }
    if (!text) {
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    
    utterance.onstart = () => {
      this.zone.run(() => this.speakingSub.next(true));
    };

    utterance.onend = () => {
      this.zone.run(() => this.speakingSub.next(false));
    };

    utterance.onerror = (event) => {
      console.error('SpeechSynthesisUtterance.onerror', event);
      this.zone.run(() => this.speakingSub.next(false));
    };

    let desiredVoice = this.voices.find(voice => voice.name.includes('Brian') && voice.lang.startsWith('en'));

    if (!desiredVoice) {
      desiredVoice = this.voices.find(voice => voice.lang === 'en-US');
    }

    if (desiredVoice) {
      utterance.voice = desiredVoice;
    }

    utterance.pitch = 0.5;
    utterance.rate = 0.9;

    this.synth.speak(utterance);
  }

  cancel(): void {
    if (this.synth.speaking) {
      this.synth.cancel();
    }
  }
}
