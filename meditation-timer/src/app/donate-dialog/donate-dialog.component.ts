import { Component } from '@angular/core';
import { MatDialogRef, MatDialogContent, MatDialogActions } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-donate-dialog',
  templateUrl: './donate-dialog.component.html',
  styleUrls: ['./donate-dialog.component.css'],
  standalone: true,
  imports: [MatDialogContent, MatDialogActions, MatButtonModule]
})
export class DonateDialogComponent {
  constructor(public dialogRef: MatDialogRef<DonateDialogComponent>) {}

  onClose() {
    this.dialogRef.close();
  }
}
