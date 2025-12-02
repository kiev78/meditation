import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TimerService } from '../timer.service';

@Component({
  selector: 'app-control-buttons',
  standalone: true,
  imports: [MatButtonModule, MatIconModule],
  template: `
    <div class="controls-container">
      <button mat-fab color="primary" aria-label="Start Timer">
        <mat-icon>play_arrow</mat-icon>
      </button>
      <button mat-fab color="warn" aria-label="Pause Timer">
        <mat-icon>pause</mat-icon>
      </button>
      <button mat-mini-fab aria-label="Reset Timer">
        <mat-icon>refresh</mat-icon>
      </button>
    </div>
  `,
  styles: [`
    .controls-container {
      display: flex;
      justify-content: center;
      gap: 1rem;
      margin: 1rem 0;
    }
  `]
})
export class ControlButtonsComponent {
  constructor(public timerService: TimerService) {}
}
