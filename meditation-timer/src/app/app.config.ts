<<<<<<< HEAD
import { ApplicationConfig } from '@angular/core';
// Make sure to import withInMemoryScrolling
import { provideRouter, withInMemoryScrolling } from '@angular/router';
=======
import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
>>>>>>> jules-meditation-timer-phase1-revised

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
<<<<<<< HEAD
    // Add the withInMemoryScrolling option here
    provideRouter(
      routes,
      withInMemoryScrolling({
        // This ensures that when you navigate back/forward, scroll position is restored.
        scrollPositionRestoration: 'enabled',
        // This is the key part that enables scrolling to an anchor element on the page.
        anchorScrolling: 'enabled',
      })
    )
=======
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideAnimations()
>>>>>>> jules-meditation-timer-phase1-revised
  ]
};
