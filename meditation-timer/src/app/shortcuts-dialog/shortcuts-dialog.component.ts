import { Component } from '@angular/core';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-shortcuts-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  templateUrl: './shortcuts-dialog.html',
  styleUrls: ['./shortcuts-dialog.css']
})
export class ShortcutsDialogComponent {}
