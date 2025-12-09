import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { TimerService } from './timer.service';
import { BellService } from './bell.service';
import { SettingsService } from './settings.service';
import { of } from 'rxjs';

// Mocks
class MockBellService {
  playBell = jasmine.createSpy('playBell');
  stopBell = jasmine.createSpy('stopBell');
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
