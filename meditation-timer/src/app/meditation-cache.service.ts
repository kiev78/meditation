import { Injectable } from '@angular/core';

export interface WordTiming {
  charIndex: number;
  time: number;
}

export interface MeditationCache {
  wordTimings: [number, WordTiming[]][]; // Using tuple array for Map serialization
  // Future settings can be added here
  voice?: string;
  rate?: number;
  pitch?: number;
}

@Injectable({
  providedIn: 'root'
})
export class MeditationCacheService {

  constructor() { }

  private getKey(duration: number, voice: string, rate: number, pitch: number): string {
    return `meditation-cache-${duration}-${voice}-${rate}-${pitch}`;
  }

  load(duration: number, voice: string, rate: number, pitch: number): MeditationCache | null {
    const key = this.getKey(duration, voice, rate, pitch);
    const data = localStorage.getItem(key);
    if (data) {
      try {
        return JSON.parse(data) as MeditationCache;
      } catch (e) {
        console.error('Error parsing meditation cache', e);
        return null;
      }
    }
    return null;
  }

  save(duration: number, voice: string, rate: number, pitch: number, data: MeditationCache) {
    const key = this.getKey(duration, voice, rate, pitch);
    try {
      const serializedData = JSON.stringify(data);
      localStorage.setItem(key, serializedData);
    } catch (e) {
      console.error('Error saving meditation cache', e);
    }
  }
}
