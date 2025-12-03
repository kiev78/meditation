import { Component, inject } from '@angular/core';
import { AsyncPipe, DatePipe, NgIf } from '@angular/common';
import { TimerService } from '../timer.service';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-timer-display',
  standalone: true,
  imports: [AsyncPipe, DatePipe, NgIf],
  template: `
    <div class="display-container">
      <h1 class="timer-digits">
        {{ formattedTime$ | async }}
      </h1>
      <p class="status">
        Status: {{ (timerService.state$ | async)?.isRunning ? 'Running' : 'Stopped' }}
      </p>
      <p class="end-time" *ngIf="(endTime$ | async) as endTime">
        <i>Timer will end at {{ endTime | date:'shortTime' }}</i>
      </p>
    </div>
  `,
  styles: [`
    .display-container {
      text-align: center;
      margin: 2rem 0;
    }
    .timer-digits {
      font-family: var(--timer-font, 'Roboto Mono', monospace);
      font-size: 5rem;
      font-weight: bold;
      margin: 0;
      font-variant-numeric: tabular-nums;
    }
    .status {
      font-size: 1.2rem;
      color: var(--mat-sys-on-surface-variant);
    }
    .end-time {
      font-size: 1rem;
      color: var(--mat-sys-on-surface-variant);
      margin-top: 0.5rem;
    }
  `]
})
export class TimerDisplayComponent {
  public timerService = inject(TimerService);

  formattedTime$: Observable<string> = this.timerService.state$.pipe(
    map(state => this.formatTime(state.remainingTime))
  );

  endTime$: Observable<Date | null> = this.timerService.state$.pipe(
    map(state => {
      if (!state.isRunning) return null;

      let secondsLeft = 0;
      if (state.remainingTime < 0) {
        // In delay phase: add delay remainder + full duration
        secondsLeft = Math.abs(state.remainingTime) + state.duration;
      } else {
        // In main phase
        secondsLeft = state.remainingTime;
      }

      if (secondsLeft <= 0) return null;

      return new Date(Date.now() + secondsLeft * 1000);
    })
  );

  private formatTime(seconds: number): string {
    const isNegative = seconds < 0;
    const absSeconds = Math.abs(seconds);

    const h = Math.floor(absSeconds / 3600);
    const m = Math.floor((absSeconds % 3600) / 60);
    const s = absSeconds % 60;

    const mStr = m.toString().padStart(2, '0');
    const sStr = s.toString().padStart(2, '0');

    let timeStr = `${mStr}:${sStr}`;
    if (h > 0) {
      const hStr = h.toString().padStart(2, '0');
      timeStr = `${hStr}:${timeStr}`;
    }

    return isNegative ? `-${timeStr}` : timeStr;
  }
}
