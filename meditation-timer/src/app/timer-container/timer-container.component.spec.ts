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
    endBellIntervals: [5],
    isBellSequenceRunning: false
  };

  const mockMeditations = [
    {
      title: "Meditation 1 - Fits",
      "start-url-duration": "10:00", // 600s
      "end-url-duration": "01:00"  // 60s
      // Total needed: 600 + 300 (silence) + 60 = 960s (16 mins)
    },
    {
      title: "Meditation 2 - Too Long",
      "start-url-duration": "25:00", // 1500s
      "end-url-duration": "01:00"  // 60s
      // Total needed: 1500 + 300 + 60 = 1860s (31 mins) -> Greater than 1800s (30 mins)
    },
    {
      title: "Meditation 3 - Fits Exactly",
      "start-url-duration": "24:00", // 1440s
      "end-url-duration": "01:00"  // 60s
      // Total needed: 1440 + 300 + 60 = 1800s (30 mins) -> Fits exactly
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

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should filter candidates correctly by time', () => {
    // Initial load
    const req = httpMock.expectOne('meditation/meditation-guided-files.json');
    req.flush(mockMeditations);

    // Update state to guided mode with 30 mins duration (1800s)
    timerServiceMock.state$.next({
      ...mockState,
      isGuided: true,
      duration: 1800, // 30 mins
      startBells: 1,
      startBellIntervals: [5] // Should be ignored in calculation
    });

    fixture.detectChanges();

    // Candidate 1 (16m) -> Fits
    // Candidate 2 (31m) -> Too long
    // Candidate 3 (30m) -> Fits exactly

    expect(component.candidates.length).toBe(2);
    expect(component.candidates.some(c => c.title === "Meditation 1 - Fits")).toBeTrue();
    expect(component.candidates.some(c => c.title === "Meditation 3 - Fits Exactly")).toBeTrue();
    expect(component.candidates.some(c => c.title === "Meditation 2 - Too Long")).toBeFalse();

    expect(component.selectedMeditation).toBeTruthy();
  });

  it('should handle no candidates fitting', () => {
    const req = httpMock.expectOne('meditation/meditation-guided-files.json');
    req.flush(mockMeditations);

    // Set duration too short for any meditation (e.g., 10 mins)
    timerServiceMock.state$.next({
      ...mockState,
      isGuided: true,
      duration: 600
    });

    fixture.detectChanges();

    expect(component.candidates.length).toBe(0);
    expect(component.selectedMeditation).toBeNull();
    expect(component.forceTTS).toBeTrue();
  });
});
