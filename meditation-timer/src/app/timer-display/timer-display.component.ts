import { Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { TimerService } from '../timer.service';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-timer-display',
  standalone: true,
  imports: [AsyncPipe],
  template: `
    <div class="display-container">
      <h1 class="timer-digits">
        {{ formattedTime$ | async }}
      </h1>
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
  `]
})
export class TimerDisplayComponent {
  public timerService = inject(TimerService);

  formattedTime$: Observable<string> = this.timerService.state$.pipe(
    map(state => this.formatTime(state.remainingTime))
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
