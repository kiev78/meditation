import { Component, inject } from '@angular/core';
import { AsyncPipe, DatePipe, NgIf } from '@angular/common';
import { TimerSetupComponent } from '../timer-setup/timer-setup.component';
import { TimerDisplayComponent } from '../timer-display/timer-display.component';
import { ControlButtonsComponent } from '../control-buttons/control-buttons.component';
import { TimerService } from '../timer.service';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-timer-container',
  standalone: true,
  imports: [TimerSetupComponent, TimerDisplayComponent, ControlButtonsComponent, AsyncPipe, DatePipe, NgIf],
  template: `
    <div class="timer-page">
      <app-timer-display></app-timer-display>
      <app-control-buttons></app-control-buttons>

      <p class="end-time" *ngIf="(endTime$ | async) as endTime">
        <i>Timer will end at {{ endTime | date:'shortTime' }}</i>
      </p>

      <app-timer-setup></app-timer-setup>
    </div>
  `,
  styles: [`
    .end-time {
      text-align: center;
      font-size: 1rem;
      color: var(--mat-sys-on-surface-variant);
      margin: 0 0 1rem 0;
    }
  `]
})
export class TimerContainerComponent {
  private timerService = inject(TimerService);

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
}
