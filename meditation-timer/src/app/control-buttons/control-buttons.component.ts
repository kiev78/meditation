import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSliderModule } from '@angular/material/slider';
import { FormsModule } from '@angular/forms';
import { TimerService } from '../timer.service';
import { AsyncPipe, NgSwitch, NgSwitchCase, NgSwitchDefault } from '@angular/common';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-control-buttons',
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatSliderModule,
    MatTooltipModule,
    FormsModule,
    AsyncPipe,
    NgSwitch,
    NgSwitchCase,
    NgSwitchDefault,
  ],
  template: `
    @if (timerService.state$ | async; as state) {
    <div class="controls-container">
      <div [ngSwitch]="state.phase" class="button-container">
        <div
          *ngSwitchCase="'delay'"
          class="countdown"
          matTooltip="Pause (Space)"
          (click)="togglePlay()"
        >
          {{ state.remainingTime }}
        </div>

        <button
          *ngSwitchCase="'bells'"
          mat-fab
          color="primary"
          aria-label="Bells are playing"
          matTooltip="Bells are playing"
          (click)="togglePlay()"
        >
          <mat-icon>notifications</mat-icon>
        </button>

        <button
          *ngSwitchCase="'meditation'"
          mat-fab
          color="accent"
          aria-label="Pause Timer"
          matTooltip="Pause (Space)"
          (click)="togglePlay()"
        >
          <mat-icon>pause</mat-icon>
        </button>

        <button
          *ngSwitchDefault
          mat-fab
          color="primary"
          aria-label="Start Timer"
          matTooltip="Start (Space)"
          (click)="togglePlay()"
        >
          <mat-icon>play_arrow</mat-icon>
        </button>
      </div>

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

      /* The .button-container ensures the layout doesn't shift
         when switching between the div and the buttons */
      .button-container {
        display: flex;
        justify-content: center;
        align-items: center;
        /* Equal to the width of a mat-fab button */
        width: 56px; 
        height: 56px;
      }

      .countdown {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 56px;
        height: 56px;
        border-radius: 4px;
        background-color: var(--mat-fab-background-color, #2196f3);
        color: var(--mat-fab-color, white);
        font-size: 1.5rem;
        cursor: pointer;
        user-select: none;
        /* Mimic mat-fab box-shadow */
        box-shadow: 0 3px 5px -1px #0003, 0 6px 10px #00000024, 0 1px 18px #0000001f;
      }

      .mat-primary .countdown {
        background-color: var(--mat-primary-500);
        color: var(--mat-primary-contrast-500);
      }
    `,
  ],
})
export class ControlButtonsComponent {
  constructor(public timerService: TimerService) {}

  togglePlay(): void {
    const state = this.timerService.stateSubjectValue;
    if (state.isRunning) {
      this.timerService.pause();
    } else {
      // This will correctly start the timer from idle/paused/finished states
      this.timerService.start();
    }
  }
}
