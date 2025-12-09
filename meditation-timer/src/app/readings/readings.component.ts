import { Component, AfterViewInit, OnDestroy, ElementRef, ViewChild, ChangeDetectorRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatMenuModule } from '@angular/material/menu';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
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
    MatMenuModule,
    MatCheckboxModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './readings.component.html',
  styleUrl: './readings.component.css'
})
export class ReadingsComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('content', { static: true }) contentEl!: ElementRef<HTMLDivElement>;

  tocItems: TocItem[] = [];
  activeFragment: string | null = null;
  private observer: IntersectionObserver | null = null;
  private settingsSub: Subscription | null = null;

  availableTypes = ['Chan', 'Zen', 'Tibetan', 'Triratna', 'Other'];
  currentPreferences: string[] = [];

  constructor(
    private cdr: ChangeDetectorRef,
    private settingsService: SettingsService
  ) {}

  ngOnInit(): void {
    this.settingsSub = this.settingsService.settings$.subscribe(settings => {
      if (settings.readingPreferences) {
        this.currentPreferences = settings.readingPreferences;
      } else {
        // Default to all selected if not set
        this.currentPreferences = [...this.availableTypes];
      }
      // Apply filter whenever settings change (or init)
      // We need to wait for view to be ready if called during init, but filterReadings checks nativeElement
      // ngAfterViewInit will also call createToc, so we can defer or just call it.
      // Since ngOnInit runs before ViewInit, the element might be there but let's be safe.
      if (this.contentEl) {
        this.filterReadings();
      }
    });

    // Load initial settings
    const current = this.settingsService.loadSettings();
    if (current && current.readingPreferences) {
      this.currentPreferences = current.readingPreferences;
    } else {
      this.currentPreferences = [...this.availableTypes];
    }
  }

  ngAfterViewInit(): void {
    // Initial filter and TOC creation
    this.filterReadings();
    this.createToc();
    this.setupObserver();
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.settingsSub?.unsubscribe();
  }

  togglePreference(type: string, event: any): void {
    // MatCheckbox change event
    const checked = event.checked;
    if (checked) {
      if (!this.currentPreferences.includes(type)) {
        this.currentPreferences = [...this.currentPreferences, type];
      }
    } else {
      this.currentPreferences = this.currentPreferences.filter(t => t !== type);
    }
    this.settingsService.saveSettings({ readingPreferences: this.currentPreferences });
  }

  private filterReadings(): void {
    if (!this.contentEl) return;

    const sections = this.contentEl.nativeElement.querySelectorAll('section[data-tag]');
    sections.forEach((section: any) => {
      const tags = section.getAttribute('data-tag').toLowerCase().split(' ');
      // Check if any of the tags match current preferences
      // Note: tags in HTML are lowercase (e.g. 'zen'), preferences are Title Case (e.g. 'Zen')
      // Need to normalize.
      const hasMatch = tags.some((tag: string) =>
        this.currentPreferences.some(pref => pref.toLowerCase() === tag)
      );

      if (hasMatch) {
        section.style.display = 'block';
      } else {
        section.style.display = 'none';
      }
    });

    // Re-create TOC to reflect visibility
    this.createToc();
  }

  private createToc(): void {
    // Only select visible headings
    const headings = Array.from(this.contentEl.nativeElement.querySelectorAll('h1, h2'))
      .filter((h: any) => h.offsetParent !== null); // Check visibility

    const items: TocItem[] = [];
    headings.forEach((heading: any) => {
      if (heading.id) {
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
      rootMargin: '0px 0px -80% 0px', // Trigger when heading is in the top 20% of the viewport
      threshold: 1.0
    };

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
