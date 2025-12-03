import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSliderModule } from '@angular/material/slider';
import { FormsModule } from '@angular/forms';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TimerService } from '../timer.service';
import { BellService } from '../bell.service';
import { AsyncPipe } from '@angular/common';

@Component({
  selector: 'app-control-buttons',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatSliderModule, FormsModule, AsyncPipe],
  template: `
    @if (timerService.state$ | async; as state) {
      <div class="controls-container">
        <button
          mat-fab
          color="primary"
          aria-label="Start Timer"
          matTooltip="Start (Space)"
          (click)="timerService.start()"
          [disabled]="state.isRunning">
          <mat-icon>play_arrow</mat-icon>
        </button>

        <button
          mat-fab
          color="accent"
          aria-label="Pause Timer"
          matTooltip="Pause (Space)"
          (click)="timerService.pause()"
          [disabled]="!state.isRunning">
          <mat-icon>pause</mat-icon>
        </button>

        <button
          mat-fab
          extended
          aria-label="Reset Timer"
          matTooltip="Reset (x)"
          (click)="timerService.reset()">
          <mat-icon>refresh</mat-icon>
          Reset
        </button>
      </div>
    }

    <div class="volume-container">
      <button mat-icon-button (click)="bellService.toggleMute()" [attr.aria-label]="(bellService.isMuted$ | async) ? 'Unmute' : 'Mute'">
        <mat-icon>{{ getVolumeIcon((bellService.volume$ | async)!) }}</mat-icon>
      </button>

      <mat-slider
        min="0"
        max="1"
        step="0.01"
        >
        <input matSliderThumb
               [value]="bellService.volume$ | async"
               (input)="onVolumeChange($event)">
      </mat-slider>
      <span style="min-width: 2rem; text-align: center;">{{ formatVolumeLabel((bellService.volume$ | async)!) }}%</span>
    </div>
  `,
  styles: [`
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
  `]
})
export class ControlButtonsComponent {
  constructor(
    public timerService: TimerService,
    public bellService: BellService
  ) {}

  onVolumeChange(event: Event | number) {
    // The `input` event from matSliderThumb is a MatSliderDragEvent, which is not easily typed here.
    // It has a `value` property. We check if the event is a number (from valueChange) or an object.
    const value = typeof event === 'number' ? event : (event.target as HTMLInputElement)?.value;
    this.bellService.setVolume(Number(value));
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
    return `${Math.round(value * 100)}`;
  }
}
