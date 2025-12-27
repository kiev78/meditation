import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule, MatIconRegistry } from '@angular/material/icon';
import { MatSliderModule } from '@angular/material/slider';
import { FormsModule } from '@angular/forms';
import { TimerService } from '../timer.service';
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
    }
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
    `,
  ],
})
export class ControlButtonsComponent {
  constructor(public timerService: TimerService) {}
}
