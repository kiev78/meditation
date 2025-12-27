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
  videoCallUrl: string = '';
  mode: 'url' | 'upload' = 'url';
  isRunning = false;
  private timerStateSubscription: Subscription | undefined;

  // Bell Settings
  startBells: number = 1;
  startBellIntervals: number[] = [5];
  endBells: number = 1;
  endBellIntervals: number[] = [5];
  intervalMinutes: number = 0;


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

    // Resize arrays to match bell count immediately (just in case of mismatch)
    this.adjustIntervals(this.startBells, this.startBellIntervals);
    this.adjustIntervals(this.endBells, this.endBellIntervals);

    // Background
    if (settings.backgroundImage) {
        this.backgroundImageUrl = settings.backgroundImage;
        this.mode = 'url';
    }

    // Video Call
    // Ensure we handle null/undefined as empty string for the input field
    this.videoCallUrl = settings.videoCallUrl ?? '';
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

  saveVideoCallUrl() {
    // If empty string, save as empty string (disabled).
    // If non-empty, save as string (override).
    // We do not save as null here because the UI input is a string.
    // If user wants to reset to config default (null), we'd need explicit logic,
    // but per requirements, clearing (empty string) effectively disables it which is fine.
    // Wait, if the user wants to USE the config default again after overriding?
    // The requirement said "clearing it would honor that too and remove the link".
    // So empty string = NO LINK.
    // If they want the default back, they might need to re-enter it or we'd need a "Reset" button.
    // Given the prompt "just deleting the link is same as clearing it so no reset button needed",
    // I will just save whatever is in the box.
    this.settingsService.saveSettings({ videoCallUrl: this.videoCallUrl });
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
