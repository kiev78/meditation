import { Component, HostListener, inject } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { HeaderComponent } from './header/header.component';
import { HelpButtonComponent } from './help-button/help-button.component';
import { ShortcutsDialogComponent } from './shortcuts-dialog/shortcuts-dialog.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, HelpButtonComponent, MatDialogModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'meditation-timer';
  private router = inject(Router);
  private dialog = inject(MatDialog);

  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    // Navigation shortcuts
    if (event.key === 't' || event.key === 'T') {
      this.router.navigate(['/']);
    } else if (event.key === 'r' || event.key === 'R') {
      this.router.navigate(['/readings']);
    } else if (event.key === '?') {
      this.openHelp();
    }
  }

  openHelp() {
    // Check if dialog is already open to prevent stacking
    if (this.dialog.openDialogs.length === 0) {
      this.dialog.open(ShortcutsDialogComponent, {
        width: '400px',
        autoFocus: false
      });
    }
  }
}
