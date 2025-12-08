import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class VoiceService {
  private synth: SpeechSynthesis;
  private voice: SpeechSynthesisVoice | null = null;

  constructor() {
    this.synth = window.speechSynthesis;
    this.loadVoices();
  }

  private loadVoices() {
    const voices = this.synth.getVoices();
    if (voices.length > 0) {
      this.setVoice();
    } else {
      this.synth.onvoiceschanged = () => this.setVoice();
    }
  }

  private setVoice() {
    const voices = this.synth.getVoices();
    // Prefer "Microsoft Brian" as requested, with fallbacks.
    this.voice = voices.find(v => v.name.includes('Brian')) ||
                 voices.find(v => v.lang.startsWith('en-US')) ||
                 voices[0];
  }

  speak(text: string) {
    if (this.synth.speaking) {
      this.synth.cancel();
    }
    if (!this.voice) {
      console.warn('Voice not loaded yet. Speaking with default voice.');
    }

    const utterance = new SpeechSynthesisUtterance(text);
    if (this.voice) {
      utterance.voice = this.voice;
    }
    utterance.pitch = 0.5;
    utterance.rate = 0.9;
    this.synth.speak(utterance);
  }

  cancel() {
    this.synth.cancel();
  }
}
