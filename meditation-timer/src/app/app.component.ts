import { Component, HostListener, OnDestroy, OnInit, inject } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd, RouterLink } from '@angular/router';
import { HeaderComponent } from './header/header.component';
import { HelpButtonComponent } from './help-button/help-button.component';
import { DonateDialogComponent } from './donate-dialog/donate-dialog.component';
import { ShortcutsDialogComponent } from './shortcuts-dialog/shortcuts-dialog.component';
import { TimerService } from './timer.service';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { ImageStorageService } from './image-storage.service';
import { filter } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, CommonModule, HelpButtonComponent, MatButtonModule, MatIconModule, MatTooltipModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'meditation-timer';
  private router = inject(Router);
  private timerService = inject(TimerService);
  private imageStorageService = inject(ImageStorageService);
  private dialog = inject(MatDialog);
  private settingsSubscription: Subscription | undefined;
  backgroundImageUrl: string | undefined;

  toggleDonateDialog() {
    this.dialog.open(DonateDialogComponent);
  }

  openShortcutsDialog() {
    this.dialog.open(ShortcutsDialogComponent, {
        width: '400px',
        autoFocus: false
    });
  }

  ngOnInit() {
    this.loadBackgroundImage();

    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.loadBackgroundImage();
    });
  }

  async loadBackgroundImage() {
    const imageFile = await this.imageStorageService.getImage();
    if (imageFile) {
      this.backgroundImageUrl = URL.createObjectURL(imageFile);
    } else {
      if(this.settingsSubscription) this.settingsSubscription.unsubscribe();
      this.settingsSubscription = this.timerService.state$.subscribe(state => {
        this.backgroundImageUrl = state.backgroundImage;
      });
    }
  }

  ngOnDestroy() {
    if (this.settingsSubscription) {
      this.settingsSubscription.unsubscribe();
    }
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    // Ignore keyboard shortcuts when typing in an input field
    const activeElement = document.activeElement as HTMLElement;
    if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || activeElement.isContentEditable)) {
      return;
    }

    // Navigation and Action shortcuts
    if (event.key === 't' || event.key === 'T') {
      this.router.navigate(['/']);
    } else if (event.key === 'r' || event.key === 'R') {
      this.router.navigate(['/readings']);
    } else if (event.key === 'd' || event.key === 'D') {
      this.toggleDonateDialog();
    } else if (event.key === 's' || event.key === 'S') {
      this.router.navigate(['/settings']);
    } else if (event.key === '?') {
      this.openShortcutsDialog();
    }
  }
}
