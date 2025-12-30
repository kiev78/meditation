import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { TimerContainerComponent, computeBellSequenceDuration, parseDurationToSeconds } from './timer-container.component';
import { TimerService } from '../timer.service';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { BehaviorSubject, of } from 'rxjs';
import { GuidedTeacherLedMeditationComponent } from '../guided-teacher-led-meditation/guided-teacher-led-meditation.component';
import { GuidedMeditationComponent } from '../guided-meditation/guided-meditation.component';
import { ActivatedRoute } from '@angular/router';
import { TimerDisplayComponent } from '../timer-display/timer-display.component';
import { NoiseService } from '../noise.service';

describe('TimerContainerComponent', () => {
  let component: TimerContainerComponent;
  let fixture: ComponentFixture<TimerContainerComponent>;
  let timerServiceMock: any;
  let httpMock: HttpTestingController;
  let noiseServiceMock: any;

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
    noiseServiceMock = jasmine.createSpyObj('NoiseService', ['startNoise', 'stopNoise']);

    await TestBed.configureTestingModule({
      imports: [TimerContainerComponent, HttpClientTestingModule],
      providers: [
        { provide: TimerService, useValue: timerServiceMock },
        { provide: ActivatedRoute, useValue: {} },
        { provide: NoiseService, useValue: noiseServiceMock }
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

  it('should start noise for regular meditation', () => {
    const startMeditationState = {
      ...mockState,
      phase: 'meditation',
      isGuided: false,
    };
    timerServiceMock.state$.next(startMeditationState);
    fixture.detectChanges();
    expect(noiseServiceMock.startNoise).toHaveBeenCalled();
  });

  it('should stop noise when meditation is finished', () => {
    timerServiceMock.state$.next({ ...mockState, phase: 'meditation', isGuided: false });
    fixture.detectChanges();
    expect(noiseServiceMock.startNoise).toHaveBeenCalled();

    const finishedState = {
      ...mockState,
      phase: 'finished',
      isGuided: false,
    };
    timerServiceMock.state$.next(finishedState);
    fixture.detectChanges();
    expect(noiseServiceMock.stopNoise).toHaveBeenCalled();
  });
  
  it('should not start noise for guided meditation', () => {
    const startMeditationState = {
      ...mockState,
      phase: 'meditation',
      isGuided: true,
    };
    timerServiceMock.state$.next(startMeditationState);
    fixture.detectChanges();
    expect(noiseServiceMock.startNoise).not.toHaveBeenCalled();
  });

  it('should stop noise when switching to guided meditation', () => {
    // Start regular meditation
    timerServiceMock.state$.next({ ...mockState, phase: 'meditation', isGuided: false });
    fixture.detectChanges();
    expect(noiseServiceMock.startNoise).toHaveBeenCalledTimes(1);

    // Switch to guided
    timerServiceMock.state$.next({ ...mockState, phase: 'stopped', isGuided: true });
    fixture.detectChanges();
    expect(noiseServiceMock.stopNoise).toHaveBeenCalledTimes(1);
  });
});
