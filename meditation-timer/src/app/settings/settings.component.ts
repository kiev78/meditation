import { Component, OnInit, inject } from '@angular/core';
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
    MatIconModule
  ],
})
export class SettingsComponent implements OnInit {
  private settingsService = inject(SettingsService);
  private imageStorageService = inject(ImageStorageService);

  backgroundImageUrl: string | undefined;
  mode: 'url' | 'upload' = 'url';

  // Bell Settings
  startBells: number = 1;
  startBellIntervals: number[] = [5];
  endBells: number = 1;
  endBellIntervals: number[] = [5];

  async ngOnInit() {
    const settings = this.settingsService.loadSettings();
    if (settings) {
      this.initSettings(settings);
    }

    // Check IndexedDB for image if no URL is set or mode implies it
    if (!this.backgroundImageUrl) {
        const imageFile = await this.imageStorageService.getImage();
        if (imageFile) {
            this.backgroundImageUrl = URL.createObjectURL(imageFile);
            this.mode = 'upload';
        }
    }
  }

  private initSettings(settings: Partial<TimerState>) {
    // Bells
    this.startBells = settings.startBells ?? 1;
    this.startBellIntervals = settings.startBellIntervals || [5];
    this.endBells = settings.endBells ?? 1;
    this.endBellIntervals = settings.endBellIntervals || [5];

    // Resize arrays to match bell count immediately (just in case of mismatch)
    this.adjustIntervals(this.startBells, this.startBellIntervals);
    this.adjustIntervals(this.endBells, this.endBellIntervals);

    // Background
    if (settings.backgroundImage) {
        this.backgroundImageUrl = settings.backgroundImage;
        this.mode = 'url';
      }
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
