import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SettingsService } from '../settings.service';
import { CommonModule } from '@angular/common';
import { ImageStorageService } from '../image-storage.service';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css'],
  standalone: true,
  imports: [FormsModule, CommonModule],
})
export class SettingsComponent implements OnInit {
  private settingsService = inject(SettingsService);
  private imageStorageService = inject(ImageStorageService);
  backgroundImageUrl: string | undefined;
  mode: 'url' | 'upload' = 'url';

  async ngOnInit() {
    const settings = this.settingsService.loadSettings();
    if (settings && settings.backgroundImage) {
      this.backgroundImageUrl = settings.backgroundImage;
      this.mode = 'url';
    } else {
      const imageFile = await this.imageStorageService.getImage();
      if (imageFile) {
        this.backgroundImageUrl = URL.createObjectURL(imageFile);
        this.mode = 'upload';
      }
    }
  }

  save() {
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
    }
  }

  clearBackground() {
    this.backgroundImageUrl = '';
    this.settingsService.saveSettings({ backgroundImage: '' });
    this.imageStorageService.clearImage();
  }
}
