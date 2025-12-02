import { ApplicationConfig } from '@angular/core';
// Make sure to import withInMemoryScrolling
import { provideRouter, withInMemoryScrolling } from '@angular/router';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
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
  ]
};
