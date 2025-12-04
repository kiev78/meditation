import { CommonModule } from '@angular/common';
import { Component, inject, HostListener, ViewChild, ElementRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TimerService } from '../timer.service';

@Component({
  selector: 'app-timer-setup',
  standalone: true,
  imports: [CommonModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, MatIconModule, MatTooltipModule, FormsModule],
  templateUrl: 'timer-setup.html',
  styleUrls: ['timer-setup.css']
})
export class TimerSetupComponent {
  timerService = inject(TimerService);

  @ViewChild('durationInput') durationInput!: ElementRef<HTMLInputElement>;

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
  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    // Check for '?' key (shift + /)
    if (event.key === '?') {
       // Prevent default if it might type into an already focused input (though ? is rarely a control char, user asked for shortcut)
       // If focus is already in an input, we might want to let them type '?'?
       // But the requirements say "settings lets add ? shortcut".
       // Let's assume global shortcut to focus settings.
       if (document.activeElement?.tagName !== 'INPUT') {
          event.preventDefault();
          this.durationInput.nativeElement.focus();
       }
    }
  }
}

