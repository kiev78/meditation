import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DonateDialogComponent } from '../donate-dialog/donate-dialog.component';
import { HelpButtonComponent } from '../help-button/help-button.component';
import { InstallDialogComponent } from '../install-dialog/install-dialog.component';
import { TimerService } from '../timer.service';
import { ConfigService } from '../config.service';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    HelpButtonComponent,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
  ],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.css'
})
export class FooterComponent {
  private dialog = inject(MatDialog);
  private timerService = inject(TimerService);
  private configService = inject(ConfigService);

  videoCallUrl$: Observable<string | null> = this.timerService.state$.pipe(
    map(state => {
      // Logic:
      // 1. If state.videoCallUrl is set (not null/undefined)
      //    - If it's a non-empty string, use it.
      //    - If it's an empty string, it means explicitly disabled -> return null.
      // 2. If state.videoCallUrl is null/undefined, fallback to config.

      const override = state.videoCallUrl;

      if (override !== undefined && override !== null) {
        return override !== '' ? override : null;
      }

      return this.configService.videoCallUrl || null;
    })
  );

  toggleDonateDialog() {
    this.dialog.open(DonateDialogComponent);
  }

  openInstallDialog() {
    this.dialog.open(InstallDialogComponent, {
      width: '400px',
      autoFocus: false
    });
  }
}
