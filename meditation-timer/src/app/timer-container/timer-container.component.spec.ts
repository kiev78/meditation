import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TimerContainerComponent, computeBellSequenceDuration, parseDurationToSeconds } from './timer-container.component';
import { TimerService } from '../timer.service';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { BehaviorSubject, of } from 'rxjs';
import { GuidedTeacherLedMeditationComponent } from '../guided-teacher-led-meditation/guided-teacher-led-meditation.component';
import { GuidedMeditationComponent } from '../guided-meditation/guided-meditation.component';
import { ActivatedRoute } from '@angular/router';

describe('TimerContainerComponent', () => {
  let component: TimerContainerComponent;
  let fixture: ComponentFixture<TimerContainerComponent>;
  let timerServiceMock: any;
  let httpMock: HttpTestingController;

  const mockState = {
    duration: 1800,
    remainingTime: 1800,
    isGuided: false,
    isRunning: false,
    startBells: 1,
    startBellIntervals: [5],
    endBells: 1,
    endBellIntervals: [5]
  };

  const mockMeditations = [
    {
      title: "Meditation 1",
      "start-url-duration": "10:00",
      "end-url-duration": "01:00"
    },
    {
      title: "Meditation 2",
      "start-url-duration": "20:00",
      "end-url-duration": "01:00"
    }
  ];

  beforeEach(async () => {
    timerServiceMock = {
      state$: new BehaviorSubject(mockState),
      stateSubjectValue: mockState,
      pause: jasmine.createSpy('pause'),
      start: jasmine.createSpy('start'),
      reset: jasmine.createSpy('reset')
    };

    await TestBed.configureTestingModule({
      imports: [TimerContainerComponent, HttpClientTestingModule],
      providers: [
        { provide: TimerService, useValue: timerServiceMock },
        { provide: ActivatedRoute, useValue: {} }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TimerContainerComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => {
    // Check for pending requests but don't fail if there are none,
    // as some tests might not trigger the http call if isGuided is false initially.
    // However, the component constructor subscribes to meditationList$ which triggers the http call.
    // So we should expect one call.
    const req = httpMock.match('meditation/meditation-guided-files.json');
    if (req.length > 0) {
        req.forEach(r => r.flush(mockMeditations));
    }
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should parse duration correctly', () => {
    expect(parseDurationToSeconds("01:00")).toBe(60);
    expect(parseDurationToSeconds("10:30")).toBe(630);
    expect(parseDurationToSeconds("01:00:00")).toBe(3600);
  });

  it('should compute bell sequence duration', () => {
    expect(computeBellSequenceDuration(1, [5])).toBe(0); // 1 bell = 0 interval
    expect(computeBellSequenceDuration(2, [5])).toBe(5);
    expect(computeBellSequenceDuration(3, [5, 10])).toBe(15);
  });

  it('should filter candidates correctly', () => {
    // Update state to guided mode with 30 mins duration (1800s)
    // Meditation 1: 10m + 5m (silence) + 1m = 16m + bellSeq(0). Fits.
    // Meditation 2: 20m + 5m (silence) + 1m = 26m. Fits.

    // We need to trigger the http call first by initializing component
    // The component subscribes in ngOnInit
    const req = httpMock.expectOne('meditation/meditation-guided-files.json');
    req.flush(mockMeditations);

    // Now update state
    timerServiceMock.state$.next({
      ...mockState,
      isGuided: true,
      duration: 1800,
      startBells: 1,
      startBellIntervals: [5] // 1 bell = 0 duration
    });

    fixture.detectChanges();

    expect(component.selectedMeditation).toBeTruthy();
    expect(component.candidates.length).toBeGreaterThan(0);
  });
});
