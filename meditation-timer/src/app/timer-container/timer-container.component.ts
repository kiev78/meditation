import { Component, inject, HostListener, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TimerSetupComponent } from '../timer-setup/timer-setup.component';
import { TimerDisplayComponent } from '../timer-display/timer-display.component';
import { ControlButtonsComponent } from '../control-buttons/control-buttons.component';
import { VolumeControlComponent } from '../volume-control/volume-control.component';
import { GuidedMeditationComponent } from '../guided-meditation/guided-meditation.component';
import { GuidedTeacherLedMeditationComponent } from '../guided-teacher-led-meditation/guided-teacher-led-meditation.component';
import { HttpClient } from '@angular/common/http';
import { combineLatest, Observable, timer } from 'rxjs';
import { TimerService } from '../timer.service';
import { map, shareReplay, distinctUntilChanged } from 'rxjs/operators';
import { EndTimeDisplayComponent } from '../end-time-display/end-time-display.component';

@Component({
  selector: 'app-timer-container',
  standalone: true,
  imports: [
    CommonModule,
    TimerSetupComponent,
    TimerDisplayComponent,
    ControlButtonsComponent,
    VolumeControlComponent,
    EndTimeDisplayComponent,
    GuidedMeditationComponent,
    GuidedTeacherLedMeditationComponent
  ],
  template: `
    <div class="timer-page">
      <ng-container *ngIf="!(timerService.state$ | async)?.isGuided; else guidedMode">
        <app-timer-display></app-timer-display>
        <app-control-buttons></app-control-buttons>
      </ng-container>

      <div *ngIf="(timerService.state$ | async)?.duration">
        <app-end-time-display
          [endTime$]="endTime$"
          [currentTime$]="currentTime$"
          [timerService]="timerService"
        ></app-end-time-display>
      </div>

      <ng-template #guidedMode>
        <ng-container *ngIf="!loading; else loader">
          <!-- If we have a selected meditation, show the teacher-led component -->
          <ng-container *ngIf="selectedMeditation && !forceTTS; else fallbackMed">
            <app-guided-teacher-led-meditation
              [meditation]="selectedMeditation"
              (next)="onNextMeditation()">
            </app-guided-teacher-led-meditation>
          </ng-container>
          <!-- Otherwise show fallback TTS -->
          <ng-template #fallbackMed>
            <app-guided-meditation (next)="onNextMeditation()"></app-guided-meditation>
          </ng-template>
        </ng-container>
        <ng-template #loader>
          <div class="loading-state">Loading meditation...</div>
        </ng-template>
      </ng-template>

      <div class="volume-wrapper">
        <app-volume-control></app-volume-control>
      </div>

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
      .loading-state {
        text-align: center;
        padding: 2rem;
        color: var(--mat-sys-on-surface-variant);
      }
    `,
  ],
})
export class TimerContainerComponent implements OnInit {
  public timerService = inject(TimerService);
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);

  private meditationList$ = this.http.get<any[]>('meditation/meditation-guided-files.json').pipe(shareReplay(1));

  // Current candidates list
  candidates: any[] = [];
  currentIndex = 0;

  // State for template
  selectedMeditation: any = null;
  forceTTS = false;
  loading = true; // Initialize as loading

  ngOnInit() {
    // Only extract relevant state properties that affect candidate selection
    const relevantState$ = this.timerService.state$.pipe(
      map(s => ({
        duration: s.duration,
        isGuided: s.isGuided,
        startBells: s.startBells,
        startBellIntervals: s.startBellIntervals
      })),
      // Deep compare check to avoid re-triggering when unrelated state changes (like remainingTime)
      distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b))
    );

    combineLatest([this.meditationList$, relevantState$]).subscribe(([list, state]) => {
      this.loading = false; // Data arrived

      if (!state.isGuided || !Array.isArray(list) || list.length === 0) {
        this.candidates = [];
        this.selectedMeditation = null;
        this.forceTTS = false;
        this.cdr.markForCheck(); // Ensure view updates
        return;
      }

      const target = state.duration;

      // Filter based on new criteria:
      // StartAudio + 300s (Silence) + EndAudio <= TimerDuration
      // Note: Bells are now excluded from the calculation as they run *before* the countdown
      this.candidates = list.filter(m => {
        const startDur = parseDurationToSeconds(m['start-url-duration'] || m['start_url_duration'] || m.duration || m['duration']);
        const endDur = parseDurationToSeconds(m['end-url-duration'] || m['end_url_duration'] || null) || 0;

        if (startDur === null) return false;

        const silence = 300; // 5 minutes fixed
        const totalNeeded = startDur + silence + endDur;

        // Check if it fits
        return totalNeeded <= target + 1; // 1s tolerance
      });

      this.currentIndex = 0;
      this.forceTTS = false;
      this.updateSelection();
      this.cdr.markForCheck(); // Ensure view updates
    });
  }

  onNextMeditation() {
    this.currentIndex++;
    this.updateSelection();
    this.cdr.markForCheck();
  }

  private updateSelection() {
    if (this.candidates.length === 0) {
      // No candidates fit -> Fallback to TTS
      this.selectedMeditation = null;
      this.forceTTS = true; // Though !selectedMeditation handles it, being explicit helps
      return;
    }

    if (this.currentIndex < this.candidates.length) {
      // Show next candidate
      this.selectedMeditation = this.candidates[this.currentIndex];
      this.forceTTS = false;
    } else if (this.currentIndex === this.candidates.length) {
      // End of list -> Show TTS
      this.selectedMeditation = null;
      this.forceTTS = true;
    } else {
      // After TTS -> Cycle back to first candidate
      this.currentIndex = 0;
      this.selectedMeditation = this.candidates[0];
      this.forceTTS = false;
    }
  }

  currentTime$ = timer(0, 1000).pipe(map(() => new Date()));

  endTime$: Observable<Date | null> = combineLatest([
    this.timerService.state$,
    timer(0, 1000)
  ]).pipe(
    map(([state]) => {
      let secondsLeft = 0;

      if (!state.isRunning) {
        // If stopped, assume starting now + full duration
        secondsLeft = state.duration;
      } else {
        if (state.remainingTime < 0) {
          // In delay phase: add delay remainder + full duration
          secondsLeft = Math.abs(state.remainingTime) + state.duration;
        } else {
          // In main phase
          secondsLeft = state.remainingTime;
        }
      }

      if (secondsLeft <= 0) return null;

      return new Date(Date.now() + secondsLeft * 1000);
    })
  );

  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    // Spacebar is handled globally in AppComponent to allow pausing from any component.
    // We only handle Reset here.
    if (event.key === 'x' || event.key === 'X') {
      this.timerService.reset();
    }
  }
}

export function parseDurationToSeconds(d: string | null | undefined): number | null {
  if (!d || typeof d !== 'string') return null;
  const parts = d.split(':').map(p => Number(p));
  if (parts.some(p => Number.isNaN(p))) return null;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return null;
}

// Deprecated in selection logic but kept for backward compat if needed elsewhere
export function computeBellSequenceDuration(count: number, intervals: number[]): number {
  if (!count || count <= 0) return 0;
  if (count === 1) return 0; // first bell immediate, no waiting
  let total = 0;
  for (let i = 0; i < count - 1; i++) {
    total += intervals[i] !== undefined ? intervals[i] : 5;
  }
  return total;
}
