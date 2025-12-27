import { CommonModule } from '@angular/common';
import { Component, inject, ViewChild, ElementRef, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSliderModule } from '@angular/material/slider';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { RouterModule } from '@angular/router';
import { TimerService } from '../timer.service';

@Component({
  selector: 'app-timer-setup',
  standalone: true,
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSliderModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    FormsModule,
    MatExpansionModule,
    MatSlideToggleModule,
    RouterModule
  ],
  templateUrl: 'timer-setup.html',
  styleUrls: ['timer-setup.css']
})
export class TimerSetupComponent implements OnInit {
  timerService = inject(TimerService);
  isExpanded = false;

  @ViewChild('durationInput') durationInput!: ElementRef<HTMLInputElement>;

  ngOnInit() {
    const savedState = localStorage.getItem('meditationOptionsExpanded');
    this.isExpanded = savedState === 'true';

    // Auto-collapse when timer starts
    let wasRunning = false;
    this.timerService.state$.subscribe(state => {
      // Only collapse on the transition from stopped to running
      if (!wasRunning && state.isRunning && this.isExpanded) {
        this.isExpanded = false;
      }
      wasRunning = state.isRunning;
    });
  }

  togglePanel(expanded: boolean) {
    this.isExpanded = expanded;
    localStorage.setItem('meditationOptionsExpanded', String(expanded));
  }

  toggleGuided(checked: boolean) {
    this.timerService.updateState({ isGuided: checked });
    this.timerService.reset();
  }

  // Helper to handle duration in minutes (state stores seconds)
  get durationMinutes(): number {
    return Math.floor(this.timerService.stateSubjectValue.duration / 60);
  }

  set durationMinutes(val: number) {
    const seconds = val * 60;
    this.timerService.updateState({ duration: seconds, remainingTime: seconds });
  }

  // Helper to handle delay in seconds
  get delaySeconds(): number {
    return this.timerService.stateSubjectValue.delay;
  }

  set delaySeconds(val: number) {
    this.timerService.updateState({ delay: val });
  }
}
