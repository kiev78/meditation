import { Component, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TimerSetupComponent } from '../timer-setup/timer-setup.component';
import { TimerDisplayComponent } from '../timer-display/timer-display.component';
import { ControlButtonsComponent } from '../control-buttons/control-buttons.component';
import { GuidedMeditationComponent } from '../guided-meditation/guided-meditation.component';
import { GuidedTeacherLedMeditationComponent } from '../guided-teacher-led-meditation/guided-teacher-led-meditation.component';
import { HttpClient } from '@angular/common/http';
import { combineLatest, Observable, of } from 'rxjs';
import { TimerService } from '../timer.service';
import { map, shareReplay } from 'rxjs/operators'; // Keep map and shareReplay from here
import { timer } from 'rxjs'; // Import timer separately
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
    GuidedMeditationComponent,
    GuidedTeacherLedMeditationComponent
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
        <ng-container *ngIf="(selectedMeditation$ | async) as med; else fallbackMed">
          <app-guided-teacher-led-meditation [meditation]="med"></app-guided-teacher-led-meditation>
        </ng-container>
        <ng-template #fallbackMed>
          <app-guided-meditation></app-guided-meditation>
        </ng-template>
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
  private http = inject(HttpClient);

  private meditationList$ = this.http.get<any[]>('meditation/meditation-guided-files.json').pipe(shareReplay(1));

  selectedMeditation$: Observable<any | null> = combineLatest([this.meditationList$, this.timerService.state$]).pipe(
    map(([list, state]) => {
      if (!state.isGuided) return null;
      if (!Array.isArray(list) || list.length === 0) return null;

      const bellSeq = computeBellSequenceDuration(state.startBells, state.startBellIntervals || [5]);
      const target = state.duration;

      const candidates = list.filter(m => {
        const startDur = parseDurationToSeconds(m['start-url-duration'] || m['start_url_duration'] || m.duration || m['duration']);
        const endDur = parseDurationToSeconds(m['end-url-duration'] || m['end_url_duration'] || null) || 0;
        if (startDur === null) return false;
        const totalNeeded = bellSeq + 3 + startDur + endDur; // 3s after bells before start
        return totalNeeded <= target + 1; // 1s tolerance
      });

      if (!candidates || candidates.length === 0) return null;
      // pick random candidate
      return candidates[Math.floor(Math.random() * candidates.length)];
    })
  );

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

function parseDurationToSeconds(d: string | null | undefined): number | null {
  if (!d || typeof d !== 'string') return null;
  const parts = d.split(':').map(p => Number(p));
  if (parts.some(p => Number.isNaN(p))) return null;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return null;
}

function computeBellSequenceDuration(count: number, intervals: number[]): number {
  if (!count || count <= 0) return 0;
  if (count === 1) return 0; // first bell immediate, no waiting
  let total = 0;
  for (let i = 0; i < count - 1; i++) {
    total += intervals[i] !== undefined ? intervals[i] : 5;
  }
  return total;
}
