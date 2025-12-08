import { Component, OnDestroy, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSliderModule } from '@angular/material/slider';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-guided-meditation',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatSliderModule, FormsModule],
  templateUrl: './guided-meditation.html',
  styleUrls: ['./guided-meditation.css']
})
export class GuidedMeditationComponent implements OnInit, OnDestroy {
  audio: HTMLAudioElement;
  isPlaying = false;
  currentTime = 0;
  duration = 0;

  constructor() {
    this.audio = new Audio('sounds/bell.mp3');
  }

  ngOnInit() {
    this.audio.addEventListener('loadedmetadata', () => {
      this.duration = this.audio.duration;
    });

    this.audio.addEventListener('timeupdate', () => {
      this.currentTime = this.audio.currentTime;
    });

    this.audio.addEventListener('ended', () => {
      this.isPlaying = false;
      this.currentTime = 0;
    });
  }

  ngOnDestroy() {
    this.audio.pause();
    this.audio.src = '';
  }

  togglePlay() {
    if (this.isPlaying) {
      this.audio.pause();
    } else {
      this.audio.play();
    }
    this.isPlaying = !this.isPlaying;
  }

  skipBack() {
    this.audio.currentTime = Math.max(0, this.audio.currentTime - 10);
    this.currentTime = this.audio.currentTime;
  }

  skipForward() {
    this.audio.currentTime = Math.min(this.duration, this.audio.currentTime + 10);
    this.currentTime = this.audio.currentTime;
  }

  seek(event: Event) {
    const target = event.target as HTMLInputElement;
    const value = Number(target.value);
    this.audio.currentTime = value;
    this.currentTime = value;
  }

  formatTime(seconds: number): string {
    if (!seconds && seconds !== 0) return '00:00';
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
      event.preventDefault(); // Prevent scrolling
      this.togglePlay();
    } else if (event.key === 'ArrowLeft') {
      this.skipBack();
    } else if (event.key === 'ArrowRight') {
      this.skipForward();
    }
  }
}
