import { Component, AfterViewInit, OnDestroy, ElementRef, ViewChild, ChangeDetectorRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatMenuModule } from '@angular/material/menu';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { SettingsService } from '../settings.service';
import { Subscription } from 'rxjs';
import { MatTooltip } from "@angular/material/tooltip";

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
    MatIconModule,
    MatTooltip,
    MatDividerModule
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

  availableTypes = ['BSBC','Chan', 'Zen', 'Tibetan', 'Theravada', 'Mahayana', 'Triratna', 'Chants', 'Music', 'Other'];
  currentPreferences: string[] = [];
  // Filter mode: default to AND per user request. Persisted to settings as `readingFilterMode`.
  filterMode: 'AND' | 'OR' = 'AND';

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
      // Only update filterMode if the emitted settings explicitly include it.
      // This prevents overwriting the user's current selection when other settings change.
      if (typeof settings.readingFilterMode !== 'undefined') {
        this.filterMode = settings.readingFilterMode as 'AND' | 'OR';
      }
      // Apply filter whenever settings change (or init)
      if (this.contentEl) {
        this.filterReadings();
      }
    });

    // Load initial settings
    const current = this.settingsService.loadSettings();
    if (current && current.readingPreferences) {
      this.currentPreferences = current.readingPreferences;
      if (current.readingFilterMode) {
        this.filterMode = current.readingFilterMode as 'AND' | 'OR';
      }
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
    // Re-apply filter after preference change
    this.filterReadings();
  }

  toggleSelectAll(event: any): void {
    const checked = event.checked;
    if (checked) {
      this.currentPreferences = [...this.availableTypes];
    } else {
      this.currentPreferences = [];
    }
    this.settingsService.saveSettings({ readingPreferences: this.currentPreferences });
    this.filterReadings();
  }

  toggleFilterMode(event: any): void {
    const checked = event.checked;
    // When checked -> AND, unchecked -> OR
    this.filterMode = checked ? 'AND' : 'OR';
    // Persist the change
    this.settingsService.saveSettings({ readingFilterMode: this.filterMode });
    // Re-apply filter with the new mode
    this.filterReadings();
  }

  private filterReadings(): void {
    if (!this.contentEl) return;

    const sections = this.contentEl.nativeElement.querySelectorAll('section[data-tag]');
    sections.forEach((section: any) => {
      const tags = section.getAttribute('data-tag').toLowerCase().split(' ');
      // Normalize preferences & tags
      const prefs = this.currentPreferences.map(p => p.toLowerCase());

      // If no explicit filtering (all selected or none selected), show everything
      const allSelected = prefs.length === 0 || prefs.length === this.availableTypes.length;

      let shouldShow = true;
      if (!allSelected) {
        if (this.filterMode === 'AND') {
          // Show section only if it contains ALL selected prefs
          shouldShow = prefs.every(pref => tags.includes(pref));
        } else {
          // OR: show if any selected pref matches
          shouldShow = prefs.some(pref => tags.includes(pref));
        }
      }

      section.style.display = shouldShow ? 'block' : 'none';
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
