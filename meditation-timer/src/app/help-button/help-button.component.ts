import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ShortcutsDialogComponent } from '../shortcuts-dialog/shortcuts-dialog.component';
import { BreakpointObserver } from '@angular/cdk/layout';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-help-button',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatDialogModule],
  template: `
    @if (isMobile()) {
      <button mat-mini-fab color="primary" class="help-fab" (click)="openHelp()" aria-label="Keyboard Shortcuts">
        <mat-icon>keyboard</mat-icon>
      </button>
    } @else {
      <button mat-fab color="primary" class="help-fab" (click)="openHelp()" aria-label="Keyboard Shortcuts">
        <mat-icon>keyboard</mat-icon>
      </button>
    }
  `,
  styles: [`
    .help-fab {
      z-index: 1000;
    }
  `]
})
export class HelpButtonComponent {
  readonly dialog = inject(MatDialog);
  private breakpointObserver = inject(BreakpointObserver);

  isMobile = toSignal(
    this.breakpointObserver.observe('(max-width: 600px)').pipe(map(result => result.matches)),
    { initialValue: false }
  );

  openHelp() {
    this.dialog.open(ShortcutsDialogComponent, {
      width: '400px',
      autoFocus: false
    });
  }
}
