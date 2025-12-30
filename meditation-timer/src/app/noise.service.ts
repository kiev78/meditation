import { Injectable, OnDestroy } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class NoiseService implements OnDestroy {
  private audioCtx: AudioContext | null = null;
  private noiseProcessor: ScriptProcessorNode | null = null;
  private gainNode: GainNode | null = null;

  constructor() { }

  startNoise() {
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

  stopNoise() {
    if (this.gainNode && this.audioCtx) {
      this.gainNode.gain.setValueAtTime(0, this.audioCtx.currentTime);
    }
  }

  ngOnDestroy(): void {
    this.stopNoise();
    if (this.noiseProcessor) {
      this.noiseProcessor.disconnect();
      this.noiseProcessor = null;
    }
    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }
    if (this.audioCtx) {
      this.audioCtx.close();
      this.audioCtx = null;
    }
  }
}
