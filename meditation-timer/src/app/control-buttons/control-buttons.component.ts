import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule, MatIconRegistry } from '@angular/material/icon';
import { MatSliderModule } from '@angular/material/slider';
import { FormsModule } from '@angular/forms';
import { TimerService } from '../timer.service';
import { BellService } from '../bell.service';
import { AsyncPipe } from '@angular/common';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-control-buttons',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatSliderModule, MatTooltipModule, FormsModule, AsyncPipe],
  template: `
    @if (timerService.state$ | async; as state) {
    <div class="controls-container">
      <button
        mat-fab
        color="primary"
        aria-label="Start Timer"
        matTooltip="Start (Space)"
        (click)="timerService.start()"
        [disabled]="state.isRunning"
      >
        <mat-icon>play_arrow</mat-icon>
      </button>

      <button
        type="button"
        mat-fab
        color="accent"
        aria-label="Pause Timer"
        matTooltip="Pause (Space)"
        (click)="timerService.pause()"
        [disabled]="!state.isRunning"
      >
        <mat-icon>pause</mat-icon>
      </button>

      <button
        type="button"
        mat-fab
        extended
        aria-label="Reset Timer"
        matTooltip="Reset (x)"
        (click)="timerService.reset()"
      >
        <mat-icon>refresh</mat-icon>
        Reset
      </button>
    </div>
    } @if ({ volume: bellService.volume$ | async }; as data) { @if (data.volume !== null) {
    <div class="volume-container">
      <button
        type="button"
        mat-icon-button
        (click)="bellService.toggleMute()"
        [attr.aria-label]="data.volume === 0 ? 'Unmute' : 'Mute'"
        [matTooltip]="data.volume === 0 ? 'Unmute' : 'Mute'"
      >
        <mat-icon>{{ getVolumeIcon(data.volume) }}</mat-icon>
      </button>

      <mat-slider min="0" max="1" step="0.01">
        <input matSliderThumb [value]="data.volume" (input)="onVolumeChange($event)" />
      </mat-slider>
      <span style="min-width: 2rem; text-align: center;"
        >{{ formatVolumeLabel(data.volume) }}</span
      >
    </div>
    } }
  `,
  styles: [
    `
      .controls-container {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 1.5rem;
        margin: 2rem 0 1rem 0;
      }

      .volume-container {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 0.5rem;
        width: 100%;
        max-width: 300px;
        margin: 0 auto 2rem auto;
      }

      mat-slider {
        width: 100%;
      }
    `,
  ],
})
export class ControlButtonsComponent {
  constructor(public timerService: TimerService, public bellService: BellService) {}

  onVolumeChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const value = parseFloat(target.value);
    this.bellService.setVolume(value);
  }

  getVolumeIcon(volume: number): string {
    if (volume === 0) {
      return 'volume_off';
    } else if (volume < 0.5) {
      return 'volume_down';
    } else {
      return 'volume_up';
    }
  }

  formatVolumeLabel(value: number): string {
    if (isNaN(value)) {
      return '0%';
    }
    const volume = Math.round(value * 100);
    return `${volume}%`;
  }

}
