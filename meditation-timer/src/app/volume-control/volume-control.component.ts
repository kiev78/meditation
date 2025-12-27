import { Component, inject } from '@angular/core';
import { CommonModule, AsyncPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSliderModule } from '@angular/material/slider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BellService } from '../bell.service';

@Component({
  selector: 'app-volume-control',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatSliderModule, MatTooltipModule, AsyncPipe],
  template: `
    @if ({ volume: bellService.volume$ | async }; as data) { @if (data.volume !== null) {
    <div class="volume-container">
      <button
        type="button"
        mat-icon-button
        (click)="bellService.toggleMute()"
        [attr.aria-label]="data.volume === 0 ? 'Unmute' : 'Mute'"
        [matTooltip]="data.volume === 0 ? 'Unmute' : 'Mute'"
      >
        <mat-icon>{{ getVolumeIcon(data.volume) }}</mat-icon>
      </button>

      <mat-slider min="0" max="1" step="0.01">
        <input matSliderThumb [value]="data.volume" (input)="onVolumeChange($event)" />
      </mat-slider>
      <span style="min-width: 2rem; text-align: center;"
        >{{ formatVolumeLabel(data.volume) }}</span
      >
    </div>
    } }
  `,
  styles: [
    `
      .volume-container {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 0.5rem;
        width: 100%;
        max-width: 300px;
        margin: 0 auto;
      }

      mat-slider {
        width: 100%;
      }
    `,
  ],
})
export class VolumeControlComponent {
  public bellService = inject(BellService);

  onVolumeChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const value = parseFloat(target.value);
    this.bellService.setVolume(value);
  }

  getVolumeIcon(volume: number): string {
    if (volume === 0) {
      return 'volume_off';
    } else if (volume < 0.5) {
      return 'volume_down';
    } else {
      return 'volume_up';
    }
  }

  formatVolumeLabel(value: number): string {
    if (isNaN(value)) {
      return '0%';
    }
    const volume = Math.round(value * 100);
    return `${volume}%`;
  }
}
