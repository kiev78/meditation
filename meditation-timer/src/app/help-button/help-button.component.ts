import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ShortcutsDialogComponent } from '../shortcuts-dialog/shortcuts-dialog.component';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-help-button',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatDialogModule, MatTooltipModule],
  template: `
    <button mat-fab color="primary" class="help-fab" (click)="openHelp()" aria-label="Keyboard Shortcuts" matTooltip="Keyboard Shortcuts (?)">
      <mat-icon>keyboard</mat-icon>
    </button>
  `,
  styles: [`
    .help-fab {
      z-index: 1000;
    }
    @media (max-width: 600px) {
      .help-fab {
        width: 40px !important;
        height: 40px !important;
      }
    }
  `]
})
export class HelpButtonComponent {
  readonly dialog = inject(MatDialog);

  openHelp() {
    this.dialog.open(ShortcutsDialogComponent, {
      width: '400px',
      autoFocus: false
    });
  }
}
