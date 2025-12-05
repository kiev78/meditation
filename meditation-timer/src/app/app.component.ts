import { Component, HostListener, OnDestroy, OnInit, inject } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { HeaderComponent } from './header/header.component';
import { HelpButtonComponent } from './help-button/help-button.component';
import { DonateDialogComponent } from './donate-dialog/donate-dialog.component';
import { TimerService } from './timer.service';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { ImageStorageService } from './image-storage.service';
import { filter } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, CommonModule, HelpButtonComponent, MatButtonModule, MatIconModule],
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
    // Navigation shortcuts
    if (event.key === 't' || event.key === 'T') {
      this.router.navigate(['/']);
    } else if (event.key === 'r' || event.key === 'R') {
      this.router.navigate(['/readings']);
    }
  }
}
