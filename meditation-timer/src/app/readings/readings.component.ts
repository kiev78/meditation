import { Component, AfterViewInit, OnDestroy, ElementRef, ViewChild, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TtsService } from '../tts.service';
import { Subscription } from 'rxjs';

interface TocItem {
  id: string;
  level: number;
  text: string;
}

@Component({
  selector: 'app-readings',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink
  ],
  templateUrl: './readings.component.html',
  styleUrl: './readings.component.css'
})
export class ReadingsComponent implements AfterViewInit, OnDestroy {
  @ViewChild('content', { static: true }) contentEl!: ElementRef<HTMLDivElement>;

  tocItems: TocItem[] = [];
  activeFragment: string | null = null;
  isSpeaking = false;
  private observer: IntersectionObserver | null = null;
  private ttsSubscription: Subscription;

  constructor(
    private cdr: ChangeDetectorRef,
    private ttsService: TtsService
  ) {
    this.ttsSubscription = this.ttsService.speaking$.subscribe(speaking => {
      this.isSpeaking = speaking;
      this.cdr.detectChanges();
    });
  }

  ngAfterViewInit(): void {
    this.createToc();
    this.setupObserver();
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.ttsSubscription.unsubscribe();
    this.ttsService.cancel(); // Stop any speech when leaving the component
  }

  private createToc(): void {
    const headings = this.contentEl.nativeElement.querySelectorAll('h1, h2');
    const items: TocItem[] = [];
    headings.forEach(heading => {
      if (heading.id) {
        items.push({
          id: heading.id,
          level: parseInt(heading.tagName.substring(1), 10),
          text: heading.textContent || ''
        });
      }
    });
    this.tocItems = items;
    this.cdr.detectChanges();
  }

  private setupObserver(): void {
    const options = {
      rootMargin: '0px 0px -80% 0px', // Trigger when heading is in the top 20% of the viewport
      threshold: 1.0
    };

    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.activeFragment = entry.target.id;
          this.cdr.detectChanges();
        }
      });
    }, options);

    this.contentEl.nativeElement.querySelectorAll('h1, h2').forEach(heading => {
      if (heading.id) {
        this.observer?.observe(heading);
      }
    });
  }

  scrollTo(fragment: string): void {
    this.contentEl.nativeElement.querySelector('#' + fragment)?.scrollIntoView({ behavior: 'auto' });
  }

  speakFullText(): void {
    const text = this.contentEl.nativeElement.innerText;
    this.ttsService.speak(text);
  }

  stopSpeaking(): void {
    this.ttsService.cancel();
  }
}
