import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { TimerService } from './timer.service';
import { BellService } from './bell.service';
import { SettingsService } from './settings.service';
import { of } from 'rxjs';

// Mocks
class MockBellService {
  playBell = jasmine.createSpy('playBell');
  stopBell = jasmine.createSpy('stopBell');
  bellDuration = 2; // Short duration for tests
}

class MockSettingsService {
  settings$ = of({});
  loadSettings = jasmine.createSpy('loadSettings').and.returnValue(null);
  saveSettings = jasmine.createSpy('saveSettings');
}

describe('TimerService', () => {
  let service: TimerService;
  let bellService: MockBellService;
  let settingsService: MockSettingsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        TimerService,
        { provide: BellService, useClass: MockBellService },
        { provide: SettingsService, useClass: MockSettingsService },
      ],
    });
    service = TestBed.inject(TimerService);
    bellService = TestBed.inject(BellService) as any;
    settingsService = TestBed.inject(SettingsService) as any;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Start Bells', () => {
    it('should play start bells according to settings', fakeAsync(() => {
      // Setup settings
      service.updateState({ startBells: 3, startBellIntervals: [2, 2], delay: 0 });
      
      service.start();

      // The main timer is async, so we need to tick once to start it
      tick(); 

      // First bell plays immediately
      expect(bellService.playBell).toHaveBeenCalledTimes(1);

      // Second bell after 2 seconds
      tick(2000);
      expect(bellService.playBell).toHaveBeenCalledTimes(2);

      // Third bell after another 2 seconds
      tick(2000);
      expect(bellService.playBell).toHaveBeenCalledTimes(3);

      // No more bells should play
      tick(1000);
      expect(bellService.playBell).toHaveBeenCalledTimes(3);

      // Cleanup
      service.pause();
      tick();
    }));

    it('should update remainingTime with negative countdown during start bells', fakeAsync(() => {
        // startBells: 2
        // Interval: [5]
        // Bell Duration: 2 (mock)
        // Total Bell Seq Duration = 5 (interval) + 2 (bell) = 7 seconds
        service.updateState({
            startBells: 2,
            startBellIntervals: [5],
            delay: 0,
            duration: 600,
            remainingTime: 600
        });

        service.start();
        tick(); // Kick off

        // isBellSequenceRunning should be true
        expect(service.stateSubjectValue.isBellSequenceRunning).toBeTrue();

        // remainingTime should start counting down from -7
        // Depending on timing (sync vs async), check value
        const time = service.stateSubjectValue.remainingTime;
        expect(time).toBeLessThan(0);
        expect(time).toBeGreaterThanOrEqual(-7);

        // Advance 1s
        tick(1000);
        // Should be -6
        expect(service.stateSubjectValue.remainingTime).toBe(-6);

        // Advance to end of bells (remaining 6s + 1s buffer logic for take?)
        // Bell duration was 7s. -7..0 (8 ticks?)
        // We ticked 1000ms. So we are at T=1000.
        // We need to tick enough to complete the bell sequence.
        // Total sequence duration ~7s.
        tick(8000); // 1s + 8s > 7s duration

        // Bells done, main timer starts
        expect(service.stateSubjectValue.isBellSequenceRunning).toBeFalse();
        expect(service.stateSubjectValue.remainingTime).toBeGreaterThanOrEqual(590); // Reset to full duration (or close enough after ticks)
    }));
  });

  describe('End Bells', () => {
    it('should play end bells when timer finishes', fakeAsync(() => {
        // Setup settings for a short meditation
        service.updateState({ 
            duration: 5, 
            remainingTime: 5,
            delay: 0, 
            startBells: 0, 
            endBells: 2, 
            endBellIntervals: [3] 
        });

        service.start();

        // Timer runs for 5 seconds, tick just before it ends
        tick(4999);
        expect(bellService.playBell).not.toHaveBeenCalled();

        // Tick past the end of the timer
        tick(1);

        // At 0, the end bell sequence starts, first bell plays
        expect(bellService.playBell).toHaveBeenCalledTimes(1);

        // Second bell after 3 seconds
        tick(3000);
        expect(bellService.playBell).toHaveBeenCalledTimes(2);
        
        // No more bells
        tick(1000);
        expect(bellService.playBell).toHaveBeenCalledTimes(2);
    }));
  });

});
