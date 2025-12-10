import { Component, OnInit, inject, AfterViewInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatRadioModule } from '@angular/material/radio';
import { MatSliderModule } from '@angular/material/slider';
import { MatIconModule } from '@angular/material/icon';
import { SettingsService } from '../settings.service';
import { ImageStorageService } from '../image-storage.service';
import { TimerState } from '../timer-state.interface';
import { TimerService } from '../timer.service';
import { Subscription } from 'rxjs';
import { MatSelectModule } from '@angular/material/select';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatRadioModule,
    MatSliderModule,
    MatIconModule,
    MatSelectModule
  ],
})
export class SettingsComponent implements OnInit, AfterViewInit {
  private settingsService = inject(SettingsService);
  private imageStorageService = inject(ImageStorageService);
  private route = inject(ActivatedRoute);
  timerService = inject(TimerService);

  backgroundImageUrl: string | undefined;
  mode: 'url' | 'upload' = 'url';
  isRunning = false;
  private timerStateSubscription: Subscription | undefined;

  // Bell Settings
  startBells: number = 1;
  startBellIntervals: number[] = [5];
  endBells: number = 1;
  endBellIntervals: number[] = [5];
  intervalMinutes: number = 0;

  // Reading Preference
  readingPreferences: string[] = ['chan', 'tibetan', 'zen', 'triratna'];

  ngOnInit() {
    const settings = this.settingsService.loadSettings();
    if (settings) {
      this.initSettings(settings);
    }

    this.timerStateSubscription = this.timerService.state$.subscribe(state => {
      this.isRunning = state.isRunning;
    });

    // Check IndexedDB for image if no URL is set or mode implies it
    if (!this.backgroundImageUrl) {
        this.imageStorageService.getImage().then(imageFile => {
            if (imageFile) {
                this.backgroundImageUrl = URL.createObjectURL(imageFile);
                this.mode = 'upload';
            }
        });
    }
  }

  ngAfterViewInit() {
    this.route.fragment.subscribe(fragment => {
      if (fragment) {
        const element = document.getElementById(fragment);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }
    });
  }

  ngOnDestroy() {
    if (this.timerStateSubscription) {
      this.timerStateSubscription.unsubscribe();
    }
  }

  private initSettings(settings: Partial<TimerState>) {
    // Bells
    this.startBells = settings.startBells ?? 1;
    this.startBellIntervals = settings.startBellIntervals || [5];
    this.endBells = settings.endBells ?? 1;
    this.endBellIntervals = settings.endBellIntervals || [5];
    this.intervalMinutes = settings.intervals ?? 0;

    // Reading Preference
    // Migration: If readingPreference (singular) exists, convert to array
    if ((settings as any).readingPreference) {
       const oldPref = (settings as any).readingPreference;
       if (oldPref === 'all') {
         this.readingPreferences = ['chan', 'tibetan', 'zen', 'triratna'];
       } else {
         this.readingPreferences = [oldPref];
       }
    } else if (settings.readingPreferences) {
      this.readingPreferences = settings.readingPreferences;
    }

    // Resize arrays to match bell count immediately (just in case of mismatch)
    this.adjustIntervals(this.startBells, this.startBellIntervals);
    this.adjustIntervals(this.endBells, this.endBellIntervals);

    // Background
    if (settings.backgroundImage) {
        this.backgroundImageUrl = settings.backgroundImage;
        this.mode = 'url';
      }
  }
  
  updateIntervalMinutes() {
    this.settingsService.saveSettings({ intervals: this.intervalMinutes });
  }

  onStartBellsChange(newValue: number) {
    this.startBells = newValue; // Ensure local model is updated
    this.adjustIntervals(newValue, this.startBellIntervals);
    this.updateBellSettings();
  }

  onEndBellsChange(newValue: number) {
    this.endBells = newValue; // Ensure local model is updated
    this.adjustIntervals(newValue, this.endBellIntervals);
    this.updateBellSettings();
  }

  onReadingPreferencesChange(newValue: string[]) {
    // Enforce at least 1 selection
    if (newValue.length === 0) {
      // If user tries to deselect all, revert to previous state or default
      // A simple way is to just add 'zen' or the first available option,
      // but it's better to not update if empty.
      // However, mat-select has already updated the model 'newValue'.
      // We force it back to default or keep the last one.
      // Since we don't have easy access to "previous" value here without tracking it,
      // let's just reset to all defaults if they clear it.
      this.readingPreferences = ['chan', 'tibetan', 'zen', 'triratna'];
      this.settingsService.saveSettings({ readingPreferences: this.readingPreferences });
      return;
    }

    this.readingPreferences = newValue;
    this.settingsService.saveSettings({ readingPreferences: newValue });
  }

  // Method to adjust the intervals array based on bell count
  private adjustIntervals(count: number, intervals: number[]) {
      const requiredIntervals = Math.max(0, count - 1);

      if (intervals.length < requiredIntervals) {
          // Add missing intervals
          while (intervals.length < requiredIntervals) {
              const lastVal = intervals.length > 0 ? intervals[intervals.length - 1] : 5;
              intervals.push(lastVal);
          }
      } else if (intervals.length > requiredIntervals) {
          // Remove excess intervals
          intervals.splice(requiredIntervals);
      }
  }

  // Called when array values change
  // Angular tracks arrays by reference, so mutating elements inside it is fine for bindings,
  // but we need to trigger save.
  trackByIndex(index: number, obj: any): any {
    return index;
  }

  updateBellSettings() {
    this.settingsService.saveSettings({
      startBells: this.startBells,
      startBellIntervals: this.startBellIntervals,
      endBells: this.endBells,
      endBellIntervals: this.endBellIntervals
    });
  }

  saveUrl() {
    if (this.mode === 'url') {
      this.settingsService.saveSettings({
        backgroundImage: this.backgroundImageUrl,
      });
      this.imageStorageService.clearImage();
    }
  }

  async onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (file) {
      await this.imageStorageService.saveImage(file);
      this.backgroundImageUrl = URL.createObjectURL(file);
      // Clear URL from settings
      this.settingsService.saveSettings({ backgroundImage: '' });
      this.mode = 'upload'; // Ensure mode is upload
    }
  }

  clearBackground() {
    this.backgroundImageUrl = '';
    this.settingsService.saveSettings({ backgroundImage: '' });
    this.imageStorageService.clearImage();
    this.saveSettings();
  }

  saveSettings() {
    // redirect to home
    window.location.href = '/';
  }
}
