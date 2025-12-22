import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { GuidedTeacherLedMeditationComponent } from './guided-teacher-led-meditation.component';
import { TimerService } from '../timer.service';
import { BellService } from '../bell.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { BehaviorSubject } from 'rxjs';
import { MatSliderModule } from '@angular/material/slider';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

describe('GuidedTeacherLedMeditationComponent', () => {
  let component: GuidedTeacherLedMeditationComponent;
  let fixture: ComponentFixture<GuidedTeacherLedMeditationComponent>;
  let timerServiceMock: any;
  let bellServiceMock: any;

  const mockState = {
    duration: 1800,
    remainingTime: 1800,
    isGuided: true,
    isRunning: false,
    startBells: 1,
    startBellIntervals: [5],
    endBells: 1,
    endBellIntervals: [5],
    isBellSequenceRunning: false
  };

  const mockMeditation = {
    title: "Test Meditation",
    teacher: "Test Teacher",
    "start-url": "start.mp3",
    "start-url-duration": "10:00",
    "end-url": "end.mp3",
    "end-url-duration": "01:00"
  };

  beforeEach(async () => {
    timerServiceMock = {
      state$: new BehaviorSubject(mockState),
      stateSubjectValue: mockState,
      pause: jasmine.createSpy('pause'),
      start: jasmine.createSpy('start'),
      seek: jasmine.createSpy('seek')
    };

    bellServiceMock = {
      playBell: jasmine.createSpy('playBell'),
      stopBell: jasmine.createSpy('stopBell'),
      bellDuration: 2
    };

    await TestBed.configureTestingModule({
      imports: [
        GuidedTeacherLedMeditationComponent,
        HttpClientTestingModule,
        MatSliderModule,
        MatIconModule,
        MatButtonModule
      ],
      providers: [
        { provide: TimerService, useValue: timerServiceMock },
        { provide: BellService, useValue: bellServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(GuidedTeacherLedMeditationComponent);
    component = fixture.componentInstance;
    component.meditation = mockMeditation;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with provided meditation', () => {
    expect(component.selected).toEqual(mockMeditation);
  });

  it('should calculate playback schedule correctly', fakeAsync(() => {
    // startBells = 1 -> bellSeq = 0
    // startAudio starts at 0, ends at 600 (10m)
    // endAudio starts at 1800 - 60 = 1740

    const checkScheduleSpy = spyOn<any>(component, 'checkSchedule').and.callThrough();
    const playStartSpy = spyOn<any>(component, 'playStartUrl');
    const playEndSpy = spyOn<any>(component, 'playEndUrl');

    // Simulate timer running at T=0
    timerServiceMock.state$.next({ ...mockState, isRunning: true, remainingTime: 1800 });
    fixture.detectChanges();
    tick(100);

    expect(checkScheduleSpy).toHaveBeenCalled();
    // Should play start audio immediately (since T=0)
    expect(playStartSpy).toHaveBeenCalledWith(0);

    // Simulate timer at T=1750 (inside end audio)
    timerServiceMock.state$.next({ ...mockState, isRunning: true, remainingTime: 50 }); // 1800 - 50 = 1750 elapsed
    fixture.detectChanges();
    tick(100);

    // Should play end audio seeked to 10s (1750 - 1740)
    expect(playEndSpy).toHaveBeenCalledWith(10);
  }));

  it('should emit next event when onNext is called', () => {
    spyOn(component.next, 'emit');
    component.onNext();
    expect(component.next.emit).toHaveBeenCalled();
  });

  it('should not play audio while start delay is active', fakeAsync(() => {
    const playStartSpy = spyOn<any>(component, 'playStartUrl');

    // Simulate start delay (remainingTime < 0)
    timerServiceMock.state$.next({
        ...mockState,
        isRunning: true,
        remainingTime: -5,
        isBellSequenceRunning: false
    });
    fixture.detectChanges();
    tick(100);

    expect(playStartSpy).not.toHaveBeenCalled();
  }));

  it('should not play audio while bell sequence is running', fakeAsync(() => {
    const playStartSpy = spyOn<any>(component, 'playStartUrl');

    // Simulate bell sequence (isBellSequenceRunning = true)
    timerServiceMock.state$.next({
        ...mockState,
        isRunning: true,
        remainingTime: 1800,
        isBellSequenceRunning: true
    });
    fixture.detectChanges();
    tick(100);

    expect(playStartSpy).not.toHaveBeenCalled();
  }));

  it('should start audio only after bells finish', fakeAsync(() => {
    const playStartSpy = spyOn<any>(component, 'playStartUrl');

    // 1. Bell Sequence Active
    timerServiceMock.state$.next({
        ...mockState,
        isRunning: true,
        remainingTime: 1800,
        isBellSequenceRunning: true
    });
    fixture.detectChanges();
    tick(8000); // Wait 8s (mock bell duration)
    expect(playStartSpy).not.toHaveBeenCalled();

    // 2. Bell Sequence Finishes
    timerServiceMock.state$.next({
        ...mockState,
        isRunning: true,
        remainingTime: 1800,
        isBellSequenceRunning: false
    });
    fixture.detectChanges();
    tick(100);

    expect(playStartSpy).toHaveBeenCalledWith(0);
  }));
});
