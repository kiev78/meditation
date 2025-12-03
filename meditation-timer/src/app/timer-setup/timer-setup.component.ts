import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TimerService } from '../timer.service';

@Component({
  selector: 'app-timer-setup',
  standalone: true,
  imports: [CommonModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, MatIconModule, FormsModule],
  templateUrl: 'timer-setup.html',
  styleUrls: ['timer-setup.css']
})
export class TimerSetupComponent {
  timerService = inject(TimerService);

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

  // Helper to handle intervals in minutes
  get intervalMinutes(): number {
    return this.timerService.stateSubjectValue.intervals;
  }

  set intervalMinutes(val: number) {
    this.timerService.updateState({ intervals: val });
  }

  // Start Bells
  get startBells(): number {
    return this.timerService.stateSubjectValue.startBells;
  }

  set startBells(val: number) {
    this.timerService.updateState({ startBells: val });
  }

  get startBellInterval(): number {
    return this.timerService.stateSubjectValue.startBellInterval;
  }

  set startBellInterval(val: number) {
    this.timerService.updateState({ startBellInterval: val });
  }

  // End Bells
  get endBells(): number {
    return this.timerService.stateSubjectValue.endBells;
  }

  set endBells(val: number) {
    this.timerService.updateState({ endBells: val });
  }

  get endBellInterval(): number {
    return this.timerService.stateSubjectValue.endBellInterval;
  }

  set endBellInterval(val: number) {
    this.timerService.updateState({ endBellInterval: val });
  }
}
