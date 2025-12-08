import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class InstallService {
  private deferredPrompt: any = null;
  installable = signal(false);
  platform = signal<'android' | 'ios' | 'edge' | 'desktop' | 'unknown'>('unknown');

  constructor() {
    this.detectPlatform();

    // Check if app is already running in standalone mode (installed)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                         (window.navigator as any).standalone === true;

    if (!isStandalone) {
      window.addEventListener('beforeinstallprompt', (e) => {
        // Prevent the mini-infobar from appearing on mobile
        e.preventDefault();
        // Stash the event so it can be triggered later.
        this.deferredPrompt = e;
        // Update UI notify the user they can install the PWA
        this.installable.set(true);
      });
    }
  }

  private detectPlatform() {
    const userAgent = window.navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(userAgent)) {
      this.platform.set('ios');
    } else if (/android/.test(userAgent)) {
      this.platform.set('android');
    } else if (/edg/.test(userAgent)) {
      this.platform.set('edge');
    } else {
      this.platform.set('desktop');
    }
  }

  async promptInstall() {
    if (!this.deferredPrompt) {
      return;
    }
    // Show the install prompt
    this.deferredPrompt.prompt();
    // Wait for the user to respond to the prompt
    const { outcome } = await this.deferredPrompt.userChoice;
    // We've used the prompt, and can't use it again, discard it
    this.deferredPrompt = null;
    this.installable.set(false);
  }
}
