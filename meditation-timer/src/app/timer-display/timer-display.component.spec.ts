import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TimerDisplayComponent } from './timer-display.component';
import { TimerService } from '../timer.service';
import { NoiseService } from '../noise.service';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { TimerState } from '../timer-state.interface';

describe('TimerDisplayComponent', () => {
  let component: TimerDisplayComponent;
  let fixture: ComponentFixture<TimerDisplayComponent>;
  let timerServiceMock: any;
  let noiseServiceMock: any;
  let stateSubject: BehaviorSubject<TimerState>;

  const defaultMockState: TimerState = {
    duration: 1800,
    remainingTime: 1800,
    delay: 5,
    intervals: 0,
    startBells: 1,
    startBellIntervals: [5],
    endBells: 1,
    endBellIntervals: [5],
    theme: 'dark',
    isRunning: false,
    isWakeLockActive: false,
    isGuided: false,
    isBellSequenceRunning: false,
    phase: 'stopped',
    elapsed: 0,
    totalDuration: 1805,
  };

  beforeEach(async () => {
    stateSubject = new BehaviorSubject<TimerState>(defaultMockState);
    timerServiceMock = {
      state$: stateSubject.asObservable(),
      get stateSubjectValue() {
        return stateSubject.value;
      }
    };
    noiseServiceMock = jasmine.createSpyObj('NoiseService', ['startNoise', 'stopNoise']);

    await TestBed.configureTestingModule({
      imports: [TimerDisplayComponent],
      providers: [
        { provide: TimerService, useValue: timerServiceMock },
        { provide: NoiseService, useValue: noiseServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TimerDisplayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display configured duration when stopped', async () => {
    stateSubject.next({
      ...defaultMockState,
      phase: 'stopped',
      duration: 1800,
      remainingTime: 1800,
    });
    fixture.detectChanges();

    const text = await firstValueFrom(component.formattedTime$);
    expect(text).toBe('30:00');
  });

  it('should display configured duration during delay and bells phase', async () => {
    stateSubject.next({
      ...defaultMockState,
      phase: 'delay',
      duration: 1800,
      remainingTime: -5,
    });
    fixture.detectChanges();

    let text = await firstValueFrom(component.formattedTime$);
    expect(text).toBe('30:00');

    stateSubject.next({
      ...defaultMockState,
      phase: 'bells',
      duration: 1800,
      remainingTime: -3,
    });
    fixture.detectChanges();

    text = await firstValueFrom(component.formattedTime$);
    expect(text).toBe('30:00');
  });

  it('should display exact remaining time during active meditation countdown', async () => {
    stateSubject.next({
      ...defaultMockState,
      phase: 'meditation',
      duration: 1800,
      remainingTime: 1745, // 29:05
      isRunning: true,
    });
    fixture.detectChanges();

    const text = await firstValueFrom(component.formattedTime$);
    expect(text).toBe('29:05');
  });

  it('should keep displaying exact remaining time when paused during meditation', async () => {
    // 1. In active meditation
    stateSubject.next({
      ...defaultMockState,
      phase: 'meditation',
      duration: 1800,
      remainingTime: 1422, // 23:42
      isRunning: true,
    });
    fixture.detectChanges();

    let text = await firstValueFrom(component.formattedTime$);
    expect(text).toBe('23:42');

    // 2. Pause
    stateSubject.next({
      ...defaultMockState,
      phase: 'paused',
      duration: 1800,
      remainingTime: 1422, // 23:42
      isRunning: false,
    });
    fixture.detectChanges();

    text = await firstValueFrom(component.formattedTime$);
    expect(text).toBe('23:42');
  });

  it('should display configured duration if paused before meditation begins (during delay)', async () => {
    stateSubject.next({
      ...defaultMockState,
      phase: 'paused',
      duration: 1800,
      remainingTime: -3,
      isRunning: false,
    });
    fixture.detectChanges();

    const text = await firstValueFrom(component.formattedTime$);
    expect(text).toBe('30:00');
  });

  it('should stop noise when paused', () => {
    stateSubject.next({
      ...defaultMockState,
      phase: 'meditation',
      isGuided: false,
    });
    fixture.detectChanges();
    expect(noiseServiceMock.startNoise).toHaveBeenCalled();

    stateSubject.next({
      ...defaultMockState,
      phase: 'paused',
      isGuided: false,
    });
    fixture.detectChanges();
    expect(noiseServiceMock.stopNoise).toHaveBeenCalled();
  });
});
