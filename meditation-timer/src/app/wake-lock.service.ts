import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class WakeLockService implements OnDestroy {
  private wakeLockSentinel: any = null;
  private isAcquired = false;

  private isActiveSubject = new BehaviorSubject<boolean>(false);
  isActive$ = this.isActiveSubject.asObservable();

  // Audio keep-awake (OS audio power assertion)
  private audioCtx: AudioContext | null = null;
  private audioSource: AudioBufferSourceNode | null = null;

  // Video keep-awake (Media power assertion fallback)
  private videoEl: HTMLVideoElement | null = null;
  private videoStream: MediaStream | null = null;

  private boundVisibilityChange = this.onVisibilityChange.bind(this);
  private boundFocus = this.onFocus.bind(this);

  constructor() {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.boundVisibilityChange);
      window.addEventListener('focus', this.boundFocus);
      window.addEventListener('pageshow', this.boundFocus);
    }
  }

  get isActive(): boolean {
    return this.isActiveSubject.value;
  }

  /**
   * Acquire wake lock across available mechanisms (Screen Wake Lock + Silent Audio + Silent Video).
   * Must be called in response to user interaction (such as clicking Start/Play).
   */
  async acquire(): Promise<void> {
    this.isAcquired = true;
    this.isActiveSubject.next(true);

    await this.requestScreenWakeLock();
    this.startAudioKeepAwake();
    this.startVideoKeepAwake();
  }

  /**
   * Release all wake locks and keep-awake mechanisms.
   */
  async release(): Promise<void> {
    this.isAcquired = false;
    this.isActiveSubject.next(false);

    await this.releaseScreenWakeLock();
    this.stopAudioKeepAwake();
    this.stopVideoKeepAwake();
  }

  // --- Layer 1: Screen Wake Lock API ---
  private async requestScreenWakeLock(): Promise<void> {
    if (!this.isAcquired) return;
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) {
      return;
    }

    try {
      if (this.wakeLockSentinel && !this.wakeLockSentinel.released) {
        return;
      }

      this.wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
      this.isActiveSubject.next(true);

      this.wakeLockSentinel.addEventListener('release', () => {
        this.wakeLockSentinel = null;
        // If wake lock was released externally (e.g. tab hidden, low battery),
        // we'll attempt to re-acquire when visible/focused if still requested.
        if (!this.isAcquired) {
          this.isActiveSubject.next(false);
        }
      });
    } catch (err) {
      // Screen wake lock request can fail if page is hidden, low battery, or unsupported policy.
      console.warn('Screen Wake Lock request failed:', err);
    }
  }

  private async releaseScreenWakeLock(): Promise<void> {
    if (this.wakeLockSentinel) {
      try {
        await this.wakeLockSentinel.release();
      } catch (err) {
        console.warn('Screen Wake Lock release failed:', err);
      } finally {
        this.wakeLockSentinel = null;
      }
    }
  }

  private onVisibilityChange(): void {
    if (this.isAcquired && document.visibilityState === 'visible') {
      this.requestScreenWakeLock();
      this.resumeAudioContext();
    }
  }

  private onFocus(): void {
    if (this.isAcquired) {
      this.requestScreenWakeLock();
      this.resumeAudioContext();
    }
  }

  // --- Layer 2: Silent Web Audio (Windows Power Manager Audio Stream In Use) ---
  private startAudioKeepAwake(): void {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      if (!this.audioCtx || this.audioCtx.state === 'closed') {
        this.audioCtx = new AudioContextClass();
      }

      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }

      if (this.audioSource) {
        try {
          this.audioSource.stop();
          this.audioSource.disconnect();
        } catch {}
      }

      // Create a 1-second silent stereo audio buffer
      const sampleRate = this.audioCtx.sampleRate || 44100;
      const buffer = this.audioCtx.createBuffer(2, sampleRate, sampleRate);
      
      const source = this.audioCtx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      // Connect to destination to ensure active OS audio pipeline
      source.connect(this.audioCtx.destination);
      source.start(0);
      this.audioSource = source;
    } catch (err) {
      console.warn('Audio keep-awake initialization failed:', err);
    }
  }

  private resumeAudioContext(): void {
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
  }

  private stopAudioKeepAwake(): void {
    if (this.audioSource) {
      try {
        this.audioSource.stop();
        this.audioSource.disconnect();
      } catch {}
      this.audioSource = null;
    }

    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      this.audioCtx.suspend().catch(() => {});
    }
  }

  // --- Layer 3: Silent Canvas/Video Loop (Media Power Assertion) ---
  private startVideoKeepAwake(): void {
    try {
      if (typeof document === 'undefined') return;

      if (!this.videoEl) {
        this.videoEl = document.createElement('video');
        this.videoEl.setAttribute('playsinline', '');
        this.videoEl.setAttribute('webkit-playsinline', '');
        this.videoEl.muted = true;
        this.videoEl.loop = true;
        this.videoEl.style.position = 'fixed';
        this.videoEl.style.top = '-9999px';
        this.videoEl.style.left = '-9999px';
        this.videoEl.style.width = '1px';
        this.videoEl.style.height = '1px';
        this.videoEl.style.opacity = '0';
        this.videoEl.style.pointerEvents = 'none';
        document.body.appendChild(this.videoEl);
      }

      const canvas = document.createElement('canvas');
      if (!this.videoStream && typeof (canvas as any).captureStream === 'function') {
        canvas.width = 2;
        canvas.height = 2;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = 'black';
          ctx.fillRect(0, 0, 2, 2);
        }
        this.videoStream = (canvas as any).captureStream(1);
        this.videoEl.srcObject = this.videoStream;
      }

      const playPromise = this.videoEl.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Playback might be prevented if no user gesture
        });
      }
    } catch (err) {
      console.warn('Video keep-awake failed:', err);
    }
  }

  private stopVideoKeepAwake(): void {
    if (this.videoEl) {
      try {
        this.videoEl.pause();
        this.videoEl.srcObject = null;
      } catch {}
    }
    if (this.videoStream) {
      try {
        this.videoStream.getTracks().forEach((t) => t.stop());
      } catch {}
      this.videoStream = null;
    }
  }

  ngOnDestroy(): void {
    this.release();
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.boundVisibilityChange);
      window.removeEventListener('focus', this.boundFocus);
      window.removeEventListener('pageshow', this.boundFocus);
    }
    if (this.videoEl && this.videoEl.parentNode) {
      this.videoEl.parentNode.removeChild(this.videoEl);
      this.videoEl = null;
    }
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      this.audioCtx.close().catch(() => {});
      this.audioCtx = null;
    }
  }
}
