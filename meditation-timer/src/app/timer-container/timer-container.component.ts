import { Component } from '@angular/core';
import { TimerSetupComponent } from '../timer-setup/timer-setup.component';
import { TimerDisplayComponent } from '../timer-display/timer-display.component';
import { ControlButtonsComponent } from '../control-buttons/control-buttons.component';

@Component({
  selector: 'app-timer-container',
  standalone: true,
  imports: [TimerSetupComponent, TimerDisplayComponent, ControlButtonsComponent],
  template: `
    <div class="timer-page">
      <app-timer-display></app-timer-display>
      <app-control-buttons></app-control-buttons>
      <app-timer-setup></app-timer-setup>
    </div>
  `
})
export class TimerContainerComponent {}
