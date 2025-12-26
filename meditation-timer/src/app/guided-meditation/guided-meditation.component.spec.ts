import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { GuidedMeditationComponent, ScheduledEvent } from './guided-meditation.component';
import { TimerService } from '../timer.service';
import { BellService } from '../bell.service';
import { MeditationCacheService } from '../meditation-cache.service';
import { BehaviorSubject } from 'rxjs';
import { TimerState } from '../timer-state.interface';

// Mocks
class MockTimerService {
  state$ = new BehaviorSubject<TimerState>({
    isRunning: false,
    duration: 600,
    remainingTime: 600,
    startBells: 0,
    startBellIntervals: [],
    endBells: 0,
    endBellIntervals: [],
    delay: 0,
    intervals: 0,
    theme: 'light',
    isWakeLockActive: false,
    isGuided: true,
    isBellSequenceRunning: false,
    phase: 'stopped',
    elapsed: 0,
    totalDuration: 600,
    readingPreferences: []
  });

  get stateSubjectValue() {
    return this.state$.value;
  }

  seek(newRem: number) {
    const newTime = { ...this.state$.value, remainingTime: newRem };
    this.state$.next(newTime);
  }
}

class MockBellService {
  bellDuration = 10.5; // Mock duration
  volume$ = new BehaviorSubject<number>(1);
}

describe('GuidedMeditationComponent', () => {
  let component: GuidedMeditationComponent;
  let fixture: ComponentFixture<GuidedMeditationComponent>;
  let httpMock: HttpTestingController;
  let timerService: MockTimerService;
  let cacheService: jasmine.SpyObj<MeditationCacheService>;

  const mockMeditationScript = [
    {
      "type": "intro",
      "content": [{ "say": "Welcome." }]
    },
    {
      "type": "poke",
      "content": [{ "say": "Hello again." }]
    },
    {
      "type": "poke",
      "content": [{ "say": "Hello again." }]
    },
    {
      "type": "poke",
      "content": [{ "say": "Hello again." }]
    },
    {
      "type": "poke",
      "content": [{ "say": "Hello again." }]
    }
  ];

  beforeEach(async () => {
    const cacheServiceSpy = jasmine.createSpyObj('MeditationCacheService', ['load', 'save']);

    await TestBed.configureTestingModule({
      imports: [
        GuidedMeditationComponent,
        HttpClientTestingModule
      ],
      providers: [
        { provide: TimerService, useClass: MockTimerService },
        { provide: BellService, useClass: MockBellService },
        { provide: MeditationCacheService, useValue: cacheServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(GuidedMeditationComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    timerService = TestBed.inject(TimerService) as any;
    cacheService = TestBed.inject(MeditationCacheService) as jasmine.SpyObj<MeditationCacheService>;
    
    // Initial data load
    fixture.detectChanges();
    const req = httpMock.expectOne('meditation/meditation-text.json');
    req.flush(mockMeditationScript);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should restart speech from the correct word when seeking into a timed section', () => {
    // Arrange
    const speakMessageSpy = spyOn<any>(component, 'speakMessage').and.callThrough();

    // Manually set up the schedule and timings for this test
    const mockSchedule: ScheduledEvent[] = [
      { time: 0, type: 'intro', content: [{ say: "Welcome" }] },
      { time: 30, type: 'poke', content: [{ say: "Focus on your breath" }] }
    ];
    component['schedule'] = mockSchedule;

    const mockWordTimings = new Map<number, { charIndex: number, time: number }[]>();
    mockWordTimings.set(1, [ // Timings for the second schedule item
      { charIndex: 0, time: 30 },    // "Focus"
      { charIndex: 6, time: 31 },    // "on"
      { charIndex: 9, time: 31.5 },  // "your"
      { charIndex: 14, time: 32 },   // "breath"
    ]);
    component['wordTimings'] = mockWordTimings;

    // Act: Seek to a time of 31.7s, which is between "your" and "breath"
    component['resumeFromTime'](31.7);

    // Assert
    // Expect speakMessage to have been called to restart the audio from the correct word
    expect(speakMessageSpy).toHaveBeenCalledWith(
      mockSchedule[1].content, // The content of the second schedule item
      1,                       // The index of the second schedule item
      9                        // The charIndex of "your", the last word before 31.7s
    );
  });

  it('should seek to silence when seeking into a section without word timings', () => {
    // Arrange
    const speakMessageSpy = spyOn<any>(component, 'speakMessage').and.callThrough();
    const mockSchedule: ScheduledEvent[] = [
      { time: 0, type: 'intro', content: [{ say: "Welcome" }] },
      { time: 30, type: 'poke', content: [{ say: "Focus on your breath" }] }
    ];
    component['schedule'] = mockSchedule;
    component['wordTimings'] = new Map(); // No pre-existing timings

    // Act: Seek to a time of 32s
    component['resumeFromTime'](32);

    // Assert
    // Speech should NOT be started immediately
    expect(speakMessageSpy).not.toHaveBeenCalled();
    // The index should be set to the current segment, so checkSchedule will look for the *next* one.
    expect(component['lastSpokenIndex']).toBe(1);
  });

  describe('Poke Schedule Calculation', () => {
    const TEN_MINUTES = 10 * 60;
    const FIFTEEN_MINUTES = 15 * 60;
    const TWENTY_MINUTES = 20 * 60;
    const THIRTY_MINUTES = 30 * 60;

    // Expected times for 10 min meditation (2 pokes)
    const POKE_10_MIN_1 = 120;
    const POKE_10_MIN_2 = 264;
    const EXPECTED_POKE_TIMES_10_MIN = [POKE_10_MIN_1, POKE_10_MIN_2];

    // Expected times for 15 min meditation (4 pokes)
    const POKE_15_MIN_1 = 120;
    const POKE_15_MIN_2 = 264;
    const POKE_15_MIN_3 = 376;
    const POKE_15_MIN_4 = 488;
    const EXPECTED_POKE_TIMES_15_MIN = [POKE_15_MIN_1, POKE_15_MIN_2, POKE_15_MIN_3, POKE_15_MIN_4];

    // Expected times for 20 min meditation (4 pokes)
    const POKE_20_MIN_1 = 120;
    const POKE_20_MIN_2 = 264;
    const POKE_20_MIN_3 = 476;
    const POKE_20_MIN_4 = 688;
    const EXPECTED_POKE_TIMES_20_MIN = [POKE_20_MIN_1, POKE_20_MIN_2, POKE_20_MIN_3, POKE_20_MIN_4];

    // Expected times for 30 min meditation (4 pokes)
    const POKE_30_MIN_1 = 120;
    const POKE_30_MIN_2 = 264;
    const POKE_30_MIN_3 = 676;
    const POKE_30_MIN_4 = 1088;
    const EXPECTED_POKE_TIMES_30_MIN = [POKE_30_MIN_1, POKE_30_MIN_2, POKE_30_MIN_3, POKE_30_MIN_4];


    beforeEach(() => {
        spyOn<any>(component, 'initVoiceAndLoadCache').and.callFake(() => {});
    });

    function setDuration(duration: number) {
      timerService.state$.next({
        ...timerService.state$.value,
        duration: duration,
        remainingTime: duration
      });
      fixture.detectChanges();
    }

    it('should schedule 2 pokes correctly for a 10-minute meditation', () => {
      setDuration(TEN_MINUTES);
      const schedule = component['schedule'];
      const pokes = schedule.filter(e => e.type === 'poke');
      
      expect(pokes.length).withContext('Should have 2 pokes').toBe(2);
      expect(schedule.length).withContext('Should have 1 intro + 2 pokes').toBe(3);

      const pokeTimes = pokes.map(p => p.time).sort((a, b) => a - b);
      expect(pokeTimes).toEqual(EXPECTED_POKE_TIMES_10_MIN);
    });

    it('should schedule 4 pokes correctly for a 15-minute meditation', () => {
      setDuration(FIFTEEN_MINUTES);
      const schedule = component['schedule'];
      const pokes = schedule.filter(e => e.type === 'poke');
      
      expect(pokes.length).withContext('Should have 4 pokes').toBe(4);
      expect(schedule.length).withContext('Should have 1 intro + 4 pokes').toBe(5);

      const pokeTimes = pokes.map(p => p.time).sort((a, b) => a - b);
      expect(pokeTimes).toEqual(EXPECTED_POKE_TIMES_15_MIN);
    });

    it('should schedule 4 pokes correctly for a 20-minute meditation', () => {
      setDuration(TWENTY_MINUTES);
      const schedule = component['schedule'];
      const pokes = schedule.filter(e => e.type === 'poke');
      
      expect(pokes.length).withContext('Should have 4 pokes').toBe(4);
      expect(schedule.length).withContext('Should have 1 intro + 4 pokes').toBe(5);

      const pokeTimes = pokes.map(p => p.time).sort((a, b) => a - b);
      expect(pokeTimes).toEqual(EXPECTED_POKE_TIMES_20_MIN);
    });

    it('should schedule 4 pokes correctly for a 30-minute meditation', () => {
      setDuration(THIRTY_MINUTES);
      const schedule = component['schedule'];
      const pokes = schedule.filter(e => e.type === 'poke');
      
      expect(pokes.length).withContext('Should have 4 pokes').toBe(4);
      expect(schedule.length).withContext('Should have 1 intro + 4 pokes').toBe(5);

      const pokeTimes = pokes.map(p => p.time).sort((a, b) => a - b);
      expect(pokeTimes).toEqual(EXPECTED_POKE_TIMES_30_MIN);
    });
  });
});
