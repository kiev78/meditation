import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AsyncPipe } from '@angular/common';
import { TimerService } from '../timer.service';

@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, AsyncPipe],
  template: `
    <button mat-icon-button (click)="toggleTheme()" aria-label="Toggle theme">
      <mat-icon>{{ (timerService.state$ | async)?.theme === 'light' ? 'dark_mode' : 'light_mode' }}</mat-icon>
    </button>
  `
})
export class ThemeToggleComponent {
  constructor(public timerService: TimerService) {}

  toggleTheme() {
    this.timerService.toggleTheme();
    this.updateBodyClass();
  }

  private updateBodyClass() {
    const isDark = this.timerService['stateSubject'].value.theme === 'dark';
    if (isDark) {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
  }

  ngOnInit() {
    // Initialize correct class on load
    this.timerService.state$.subscribe(state => {
      if (state.theme === 'dark') {
        document.body.classList.add('dark-theme');
      } else {
        document.body.classList.remove('dark-theme');
      }
    });
  }
}
