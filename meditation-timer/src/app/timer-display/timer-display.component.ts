import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { TimerService } from '../timer.service';
import { distinctUntilChanged, map } from 'rxjs/operators';
import { Observable, Subscription } from 'rxjs';
import { NoiseService } from '../../app/noise.service';

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
export class TimerDisplayComponent implements OnInit, OnDestroy {
  public timerService = inject(TimerService);
  private noiseService = inject(NoiseService);
  private stateSub: Subscription | null = null;

  formattedTime$: Observable<string> = this.timerService.state$.pipe(
    map(state => {
      if (state.phase === 'meditation') {
        return this.formatTime(state.remainingTime);
      } else {
        return this.formatTime(state.duration);
      }
    })
  );

  ngOnInit(): void {
    this.stateSub = this.timerService.state$
      .pipe(
        map(state => ({ phase: state.phase, isGuided: state.isGuided })),
        distinctUntilChanged((prev, curr) => prev.phase === curr.phase && prev.isGuided === curr.isGuided)
      )
      .subscribe(state => {
        if (state.isGuided) {
          this.noiseService.stopNoise();
          return;
        }

        if (state.phase === 'meditation') {
          this.noiseService.startNoise();
        } else if (state.phase === 'stopped' || state.phase === 'finished') {
          this.noiseService.stopNoise();
        }
      });
  }

  ngOnDestroy(): void {
    if (this.stateSub) {
      this.stateSub.unsubscribe();
    }
    this.noiseService.stopNoise();
  }

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
