import { Component, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TimerSetupComponent } from '../timer-setup/timer-setup.component';
import { TimerDisplayComponent } from '../timer-display/timer-display.component';
import { ControlButtonsComponent } from '../control-buttons/control-buttons.component';
import { GuidedMeditationComponent } from '../guided-meditation/guided-meditation.component';
import { TimerService } from '../timer.service';
import { map } from 'rxjs/operators';
import { Observable, timer } from 'rxjs';
import { EndTimeDisplayComponent } from '../end-time-display/end-time-display.component';

@Component({
  selector: 'app-timer-container',
  standalone: true,
  imports: [
    CommonModule,
    TimerSetupComponent,
    TimerDisplayComponent,
    ControlButtonsComponent,
    EndTimeDisplayComponent,
    GuidedMeditationComponent
  ],
  template: `
    <div class="timer-page">
      <ng-container *ngIf="!(timerService.state$ | async)?.isGuided; else guidedMode">
        <app-timer-display></app-timer-display>
        <app-control-buttons></app-control-buttons>

        <app-end-time-display
          [endTime$]="endTime$"
          [currentTime$]="currentTime$"
          [timerService]="timerService"
        ></app-end-time-display>
      </ng-container>

      <ng-template #guidedMode>
        <app-guided-meditation></app-guided-meditation>
      </ng-template>

      <app-timer-setup></app-timer-setup>
    </div>
  `,
  styles: [
    `
      .end-time {
        text-align: center;
        font-size: 1rem;
        color: var(--mat-sys-on-surface-variant);
        margin: 0 0 1rem 0;
      }
    `,
  ],
})
export class TimerContainerComponent {
  timerService = inject(TimerService);

  currentTime$ = timer(0, 1000).pipe(map(() => new Date()));

  endTime$: Observable<Date | null> = this.timerService.state$.pipe(
    map((state) => {
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

  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    // Only handle global shortcuts if NOT in guided mode, OR if guided mode doesn't consume them.
    // The requirement didn't specify that Space/X should work for guided mode,
    // but typically users expect Space to pause whatever is playing.
    // However, GuidedMeditationComponent handles its own logic.
    // For now, I will disable the global timer shortcuts when in guided mode to avoid confusion.

    if (this.timerService.stateSubjectValue.isGuided) return;

    if (event.key === ' ') {
      if (event.repeat) return; // Prevent rapid toggling
      event.preventDefault(); // Prevent scrolling
      const isRunning = this.timerService.stateSubjectValue.isRunning;
      if (isRunning) {
        this.timerService.pause();
      } else {
        this.timerService.start();
      }
    } else if (event.key === 'x' || event.key === 'X') {
      this.timerService.reset();
    }
  }
}
