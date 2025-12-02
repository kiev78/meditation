import { Component } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { ThemeToggleComponent } from '../theme-toggle/theme-toggle.component';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [MatToolbarModule, MatButtonModule, MatIconModule, RouterModule, ThemeToggleComponent],
  template: `
    <mat-toolbar color="primary" class="sticky-header">
      <span routerLink="/" class="title">Meditation Timer</span>
      <span class="spacer"></span>
      <nav>
        <button mat-button routerLink="/">Timer</button>
        <button mat-button routerLink="/readings">Readings</button>
      </nav>
      <app-theme-toggle></app-theme-toggle>
    </mat-toolbar>
  `,
  styles: [`
    .sticky-header {
      position: sticky;
      top: 0;
      z-index: 1000;
    }
    .spacer {
      flex: 1 1 auto;
    }
    .title {
      cursor: pointer;
      font-weight: 500;
    }
    nav {
      margin-right: 16px;
    }
  `]
})
export class HeaderComponent {}
