import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';

export interface AppConfig {
  videoCallUrl?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  private http = inject(HttpClient);
  private config: AppConfig = {};

  async loadConfig(): Promise<void> {
    try {
      const config = await firstValueFrom(
        this.http.get<AppConfig>('assets/config.json').pipe(
          catchError((err) => {
            console.warn('Could not load config.json', err);
            return of({} as AppConfig);
          })
        )
      );
      this.config = config;
    } catch (e) {
      console.warn('Error loading config', e);
      this.config = {};
    }
  }

  get videoCallUrl(): string | undefined {
    return this.config.videoCallUrl;
  }
}
