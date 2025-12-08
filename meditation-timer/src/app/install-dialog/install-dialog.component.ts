import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { InstallService } from '../install.service';

@Component({
  selector: 'app-install-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <h2 mat-dialog-title>Install Meditation Timer</h2>
    <mat-dialog-content>
      <div class="install-content">
        <div class="feature-list">
          <div class="feature-item">
            <mat-icon class="check-icon">check_circle</mat-icon>
            <span>Works offline</span>
          </div>
          <div class="feature-item">
            <mat-icon class="check-icon">check_circle</mat-icon>
            <span>No internet required for bell sound</span>
          </div>
          <div class="feature-item">
            <mat-icon class="check-icon">check_circle</mat-icon>
            <span>Native app experience</span>
          </div>
        </div>

        <div class="instructions" [ngSwitch]="platform()">

          <div *ngSwitchCase="'ios'" class="ios-instructions">
            <p>To install on iOS:</p>
            <ol>
              <li>Tap the <strong>Share</strong> button <mat-icon inline>ios_share</mat-icon> in your browser toolbar.</li>
              <li>Scroll down and tap <strong>Add to Home Screen</strong> <mat-icon inline>add_box</mat-icon>.</li>
            </ol>
          </div>

          <div *ngSwitchCase="'android'" class="android-instructions">
            <p *ngIf="canPrompt()">Click the button below to install directly.</p>
            <p *ngIf="!canPrompt()">Tap the menu icon (three dots) and select <strong>Install App</strong> or <strong>Add to Home Screen</strong>.</p>
          </div>

          <div *ngSwitchCase="'edge'" class="edge-instructions">
            <p *ngIf="canPrompt()">Click the button below to install.</p>
            <p *ngIf="!canPrompt()">Click the menu icon (…), go to more tools, select <strong>Apps</strong>, and select <strong>Install Meditation Timer</strong>.</p>
            <p *ngIf="!canPrompt()">You can then choose to pin it to your start menu and/or taskbar and run it just like any other app.</p>
          </div>

          <div *ngSwitchDefault class="desktop-instructions">
            <p *ngIf="canPrompt()">Click the button below to install.</p>
            <p *ngIf="!canPrompt()">Look for the install icon <mat-icon inline>install_desktop</mat-icon> in your address bar, or check the browser menu (⋮) under <strong>Apps</strong>.</p>
            <p *ngIf="!canPrompt()">You can then choose to pin it to your start menu and/or taskbar and run it just like any other app.</p>
          </div>
        </div>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Close</button>
      <button mat-raised-button color="primary"
              *ngIf="canPrompt()"
              (click)="install()">
        Install App
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .install-content {
      padding-bottom: 10px;
    }
    .feature-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 24px;
      background: rgba(0,0,0,0.03);
      padding: 16px;
      border-radius: 8px;
    }
    .feature-item {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .check-icon {
      color: #4caf50;
      font-size: 20px;
      width: 20px;
      height: 20px;
    }
    .instructions {
      font-size: 16px;
      line-height: 1.5;
    }
    ol {
      padding-left: 20px;
      margin: 8px 0;
    }
    li {
      margin-bottom: 8px;
    }
    .ios-instructions mat-icon {
      vertical-align: middle;
      font-size: 18px;
      width: 18px;
      height: 18px;
    }
  `]
})
export class InstallDialogComponent {
  private installService = inject(InstallService);
  private dialogRef = inject(MatDialogRef<InstallDialogComponent>);

  platform = this.installService.platform;
  canPrompt = this.installService.installable;

  async install() {
    await this.installService.promptInstall();
    this.dialogRef.close();
  }
}
