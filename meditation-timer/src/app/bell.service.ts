import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class BellService {
  constructor() {}

  // Stub methods for audio
  playBell() {
    console.log('Bell played (stub)');
  }
}
