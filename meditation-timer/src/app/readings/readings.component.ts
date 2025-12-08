import { Component, AfterViewInit, OnDestroy, ElementRef, ViewChild, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SettingsService } from '../settings.service';
import { Subscription } from 'rxjs';

interface TocItem {
  id: string;
  level: number;
  text: string;
}

@Component({
  selector: 'app-readings',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule
  ],
  templateUrl: './readings.component.html',
  styleUrl: './readings.component.css'
})
export class ReadingsComponent implements AfterViewInit, OnDestroy {
  @ViewChild('content', { static: true }) contentEl!: ElementRef<HTMLDivElement>;

  tocItems: TocItem[] = [];
  activeFragment: string | null = null;
  private observer: IntersectionObserver | null = null;
  private settingsService = inject(SettingsService);
  private settingsSubscription?: Subscription;

  // Default to all just in case, but will load from settings
  currentPreferences: string[] = ['chan', 'tibetan', 'zen', 'triratna'];

  constructor(private cdr: ChangeDetectorRef) {}

  ngAfterViewInit(): void {
    // Initial load
    const settings = this.settingsService.loadSettings();
    if (settings) {
       this.updatePreferencesFromSettings(settings);
    }

    // Subscribe to changes
    this.settingsSubscription = this.settingsService.settings$.subscribe(settings => {
      this.updatePreferencesFromSettings(settings);
    });

    this.setupObserver();
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.settingsSubscription?.unsubscribe();
  }

  private updatePreferencesFromSettings(settings: any) {
    if (settings.readingPreferences) {
      this.currentPreferences = settings.readingPreferences;
    } else if (settings.readingPreference) {
      // Legacy handling
       const old = settings.readingPreference;
       this.currentPreferences = (old === 'all') ? ['chan', 'tibetan', 'zen', 'triratna'] : [old];
    }

    this.filterContent();
    this.createToc();
  }

  private filterContent() {
    const elements = this.contentEl.nativeElement.querySelectorAll('[data-tag]');
    elements.forEach((el: Element) => {
      const htmlEl = el as HTMLElement;
      const tags = htmlEl.dataset['tag']?.split(' ') || [];

      // Check if any of the element's tags match the user's selected preferences
      const hasMatch = tags.some(tag => this.currentPreferences.includes(tag));

      // Also, we need to handle the content *following* the header until the next header.
      // The current HTML structure is flat: h2, p, p, h2...
      // So if we hide an h2, we should probably hide the paragraphs following it?
      // Or does the user only want to hide the headers?
      // "showing only the content that applies" -> implies hiding the section.

      // Since the HTML is not structured in <section> tags, this is tricky.
      // However, looking at readings.component.html, it's mostly <h2>...</h2> <p>...</p>.
      // Wait, the data-tag is ON the <h2>.
      // I need to hide the <h2> AND the following siblings until the next header.

      if (hasMatch) {
        htmlEl.style.display = ''; // Reset
        this.toggleSection(htmlEl, true);
      } else {
        htmlEl.style.display = 'none';
        this.toggleSection(htmlEl, false);
      }
    });
  }

  private toggleSection(header: HTMLElement, show: boolean) {
    let next = header.nextElementSibling as HTMLElement;
    while (next && !['H1', 'H2'].includes(next.tagName)) {
      next.style.display = show ? '' : 'none';
      next = next.nextElementSibling as HTMLElement;
    }
  }

  private createToc(): void {
    const headings = this.contentEl.nativeElement.querySelectorAll('h1, h2');
    const items: TocItem[] = [];
    headings.forEach((heading: Element) => {
      const htmlHeading = heading as HTMLElement;
      // Only include visible headings
      if (htmlHeading.style.display !== 'none' && heading.id) {
        items.push({
          id: heading.id,
          level: parseInt(heading.tagName.substring(1), 10),
          text: heading.textContent || ''
        });
      }
    });
    this.tocItems = items;
    this.cdr.detectChanges();
  }

  private setupObserver(): void {
    const options = {
      rootMargin: '0px 0px -80% 0px',
      threshold: 1.0
    };

    if (this.observer) {
        this.observer.disconnect();
    }

    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.activeFragment = entry.target.id;
          this.cdr.detectChanges();
        }
      });
    }, options);

    this.contentEl.nativeElement.querySelectorAll('h1, h2').forEach(heading => {
      if (heading.id) {
        this.observer?.observe(heading);
      }
    });
  }

  scrollTo(fragment: string): void {
    this.contentEl.nativeElement.querySelector('#' + fragment)?.scrollIntoView({ behavior: 'auto' });
  }
}
