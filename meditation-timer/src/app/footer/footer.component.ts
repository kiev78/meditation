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
