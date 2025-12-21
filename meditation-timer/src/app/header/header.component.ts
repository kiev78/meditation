import { Component, OnInit, OnDestroy } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink, Router, NavigationEnd } from '@angular/router';
import { ThemeToggleComponent } from '../theme-toggle/theme-toggle.component';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { Subscription, filter } from 'rxjs';
import { SettingsService } from '../settings.service';
import { ActivatedRoute } from '@angular/router';

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
    MatIconModule
  ],
  templateUrl: './header.html',
  styleUrl: './header.css' 
})
export class HeaderComponent implements OnInit, OnDestroy {
  isReadingsPage = false;
  readingPreference: string | null = null;
  private routerSubscription?: Subscription;

  constructor(private router: Router, private settingsService: SettingsService, private route: ActivatedRoute) {}

  ngOnInit() {
    this.routerSubscription = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.isReadingsPage = event.urlAfterRedirects.includes('/readings');
    });
  }

  ngOnDestroy() {
    this.routerSubscription?.unsubscribe();
  }
}
