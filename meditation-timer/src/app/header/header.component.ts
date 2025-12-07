import { Component, OnInit, OnDestroy } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink, Router, NavigationEnd } from '@angular/router';
import { ThemeToggleComponent } from '../theme-toggle/theme-toggle.component';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { SettingsService } from '../settings.service';
import { Subscription, filter } from 'rxjs';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule,
    MatToolbarModule,
    MatButtonModule,
    MatTooltipModule,
    RouterLink,
    ThemeToggleComponent,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule
  ],
  templateUrl: './header.html',
  styleUrl: './header.css'
})
export class HeaderComponent implements OnInit, OnDestroy {
  isReadingsPage = false;
  readingPreference: 'chan' | 'tibetan' | 'zen' | 'all' = 'all';
  private routerSubscription?: Subscription;

  constructor(private router: Router, private settingsService: SettingsService) {}

  ngOnInit() {
    this.routerSubscription = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.isReadingsPage = event.urlAfterRedirects.includes('/readings');
    });

    // Initialize state based on current URL immediately
    this.isReadingsPage = this.router.url.includes('/readings');

    // Load initial preference
    const settings = this.settingsService.loadSettings();
    if (settings?.readingPreference) {
      this.readingPreference = settings.readingPreference;
    }
  }

  ngOnDestroy() {
    this.routerSubscription?.unsubscribe();
  }

  onPreferenceChange(value: 'chan' | 'tibetan' | 'zen' | 'all') {
    this.readingPreference = value;
    this.settingsService.saveSettings({ readingPreference: value });
  }
}
