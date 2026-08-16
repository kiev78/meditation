import { TestBed } from '@angular/core/testing';
import { BellService } from './bell.service';

describe('BellService', () => {
  let service: BellService;
  let audioMock: any;

  beforeEach(() => {
    // Mock HTMLAudioElement
    audioMock = {
      load: jasmine.createSpy('load'),
      play: jasmine.createSpy('play').and.returnValue(Promise.resolve()),
      pause: jasmine.createSpy('pause'),
      currentTime: 0,
      volume: 1,
      // Add logic to simulate volume setter working if we want to test it on instance
    };

    // Intercept Audio constructor
    spyOn(window as any, 'Audio').and.returnValue(audioMock);

    TestBed.configureTestingModule({});

    // Clear localStorage before each test
    localStorage.clear();

    service = TestBed.inject(BellService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should set volume and persist it', () => {
    service.setVolume(0.5);

    // expect(audioMock.volume).toBe(0.5); // This fails because no audio is active
    expect(localStorage.getItem('meditation-timer-volume')).toBe('0.5');

    service.volume$.subscribe(vol => {
      expect(vol).toBe(0.5);
    });

    // Verify that IF we play a bell, it gets the new volume
    service.playBell();
    expect(audioMock.volume).toBe(0.5);
  });

  it('should handle muting correctly', () => {
    service.setVolume(0.8);
    // Play a bell so it is in activeAudios (so we can test volume update on active bells)
    service.playBell();

    // Check initial volume
    expect(audioMock.volume).toBe(0.8);

    service.toggleMute(); // Mute

    expect(audioMock.volume).toBe(0);
    expect(localStorage.getItem('meditation-timer-volume')).toBe('0');
    expect(localStorage.getItem('meditation-timer-muted')).toBe('true');
    expect(localStorage.getItem('meditation-timer-prev-volume')).toBe('0.8');

    service.toggleMute(); // Unmute

    expect(audioMock.volume).toBe(0.8);
    expect(localStorage.getItem('meditation-timer-volume')).toBe('0.8');
    expect(localStorage.getItem('meditation-timer-muted')).toBe('false');
  });

  it('should play bell with current volume', () => {
    service.setVolume(0.3);
    service.playBell();

    expect(audioMock.volume).toBe(0.3);
    expect(audioMock.play).toHaveBeenCalled();
  });

  it('should default to bell1 sound', () => {
    expect(service.selectedBell).toBe('bell1');
    service.playBell();
    expect((window as any).Audio).toHaveBeenCalledWith('sounds/bell1.mp3');
  });

  it('should allow changing bell sound and persist to localStorage', () => {
    service.setBellSound('bell2');
    expect(service.selectedBell).toBe('bell2');
    expect(localStorage.getItem('meditation-timer-bell-sound')).toBe('bell2');

    service.playBell();
    expect((window as any).Audio).toHaveBeenCalledWith('sounds/bell2.mp3');
  });

  it('should allow playing a specific bell sound explicitly', () => {
    service.setBellSound('bell1');
    service.playBell('bell2');
    expect((window as any).Audio).toHaveBeenCalledWith('sounds/bell2.mp3');
  });

  it('should allow selecting bell3 and persist to localStorage', () => {
    service.setBellSound('bell3');
    expect(service.selectedBell).toBe('bell3');
    expect(localStorage.getItem('meditation-timer-bell-sound')).toBe('bell3');

    service.playBell();
    expect((window as any).Audio).toHaveBeenCalledWith('sounds/bell3.mp3');
  });
});

