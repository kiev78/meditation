import { Component } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

@Component({
  selector: 'app-timer-setup',
  standalone: true,
  imports: [MatFormFieldModule, MatInputModule, MatSelectModule],
  template: `
    <div class="setup-container">
      <h3>Timer Setup</h3>
      <mat-form-field appearance="fill">
        <mat-label>Duration (minutes)</mat-label>
        <input matInput type="number" value="30">
      </mat-form-field>

      <mat-form-field appearance="fill">
        <mat-label>Delay (seconds)</mat-label>
        <input matInput type="number" value="45">
      </mat-form-field>

      <mat-form-field appearance="fill">
        <mat-label>Interval Bells</mat-label>
        <mat-select>
          <mat-option value="0">None</mat-option>
          <mat-option value="1">Every 5 mins</mat-option>
          <mat-option value="2">Every 10 mins</mat-option>
        </mat-select>
      </mat-form-field>
    </div>
  `,
  styles: [`
    .setup-container {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      padding: 1rem;
      max-width: 400px;
      margin: 0 auto;
    }
  `]
})
export class TimerSetupComponent {}
