import { Component, HostListener, inject } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { HeaderComponent } from './header/header.component';
import { HelpButtonComponent } from './help-button/help-button.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, HelpButtonComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'meditation-timer';
  private router = inject(Router);

  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    // Navigation shortcuts
    if (event.key === 't' || event.key === 'T') {
      this.router.navigate(['/']);
    } else if (event.key === 'r' || event.key === 'R') {
      this.router.navigate(['/readings']);
    }
  }
}
