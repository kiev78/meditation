import { Component, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AsyncPipe } from '@angular/common';
import { TimerService } from '../timer.service';

@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatTooltipModule, AsyncPipe],
  template: `
    <button mat-icon-button (click)="toggleTheme()" [matTooltip]="(timerService.state$ | async)?.theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'" aria-label="Toggle theme">
      <mat-icon>{{ (timerService.state$ | async)?.theme === 'light' ? 'dark_mode' : 'light_mode' }}</mat-icon>
    </button>
  `
})
export class ThemeToggleComponent implements OnInit {
  constructor(public timerService: TimerService) {}

  toggleTheme() {
    this.timerService.toggleTheme();
  }

  ngOnInit() {
    this.timerService.state$.subscribe(state => {
      if (state.theme === 'dark') {
        document.body.classList.add('dark-theme');
      } else {
        document.body.classList.remove('dark-theme');
      }
    });
  }
}
