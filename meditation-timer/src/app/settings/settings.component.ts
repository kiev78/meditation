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
  startBellInterval: number = 5;
  endBells: number = 1;
  endBellInterval: number = 5;

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
    this.startBellInterval = settings.startBellInterval ?? 5;
    this.endBells = settings.endBells ?? 1;
    this.endBellInterval = settings.endBellInterval ?? 5;

    // Background
    if (settings.backgroundImage) {
        this.backgroundImageUrl = settings.backgroundImage;
        this.mode = 'url';
      }
  }

  updateBellSettings() {
    this.settingsService.saveSettings({
      startBells: this.startBells,
      startBellInterval: this.startBellInterval,
      endBells: this.endBells,
      endBellInterval: this.endBellInterval
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
  }
}
