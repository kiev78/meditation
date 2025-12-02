import { Component } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { TimerService } from '../timer.service';

@Component({
  selector: 'app-timer-display',
  standalone: true,
  imports: [AsyncPipe],
  template: `
    <div class="display-container">
      <!-- Using a mock value for display since logic isn't fully implemented -->
      <h1 class="timer-digits">30:00</h1>
      <p>Status: {{ (timerService.state$ | async)?.isRunning ? 'Running' : 'Stopped' }}</p>
    </div>
  `,
  styles: [`
    .display-container {
      text-align: center;
      margin: 2rem 0;
    }
    .timer-digits {
      font-family: var(--timer-font, monospace);
      font-size: 5rem;
      font-weight: bold;
      margin: 0;
    }
  `]
})
export class TimerDisplayComponent {
  constructor(public timerService: TimerService) {}
}
