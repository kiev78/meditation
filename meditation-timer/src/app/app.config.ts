import { ApplicationConfig, isDevMode, importProvidersFrom, APP_INITIALIZER } from '@angular/core';
import { provideHttpClient, withFetch } from '@angular/common/http';
// Make sure to import withInMemoryScrolling
import { provideRouter, withInMemoryScrolling, withHashLocation } from '@angular/router';
import { ConfigService } from './config.service';
import { provideAnimations } from '@angular/platform-browser/animations';

import { routes } from './app.routes';
import { provideServiceWorker } from '@angular/service-worker';
import { MatDialogModule } from '@angular/material/dialog';

export const appConfig: ApplicationConfig = {
  providers: [
    provideAnimations(),
    importProvidersFrom(MatDialogModule),
    provideHttpClient(withFetch()),
    // Add the withInMemoryScrolling option here
    provideRouter(
      routes,
      withInMemoryScrolling({
        // This ensures that when you navigate back/forward, scroll position is restored.
        scrollPositionRestoration: 'enabled',
        // This is the key part that enables scrolling to an anchor element on the page.
        anchorScrolling: 'enabled',
      }),
      withHashLocation()
    ),
    provideServiceWorker('ngsw-worker.js', {
        enabled: !isDevMode(),
        registrationStrategy: 'registerWhenStable:30000'
    }),
    {
      provide: APP_INITIALIZER,
      useFactory: (configService: ConfigService) => () => configService.loadConfig(),
      deps: [ConfigService],
      multi: true
    }
  ]
};
