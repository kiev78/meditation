import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TimerService } from '../timer.service';
import { AsyncPipe } from '@angular/common';

@Component({
  selector: 'app-control-buttons',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatTooltipModule, AsyncPipe],
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
  `,
  styles: [`
    .controls-container {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 1.5rem;
      margin: 2rem 0;
    }
  `]
})
export class ControlButtonsComponent {
  constructor(public timerService: TimerService) {}
}
