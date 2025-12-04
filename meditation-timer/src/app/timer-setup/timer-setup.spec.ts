import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TimerSetupComponent } from './timer-setup.component';
import { TimerService } from '../timer.service';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

describe('TimerSetup', () => {
  let component: TimerSetupComponent;
  let fixture: ComponentFixture<TimerSetupComponent>;
  let timerServiceMock: any;

  beforeEach(async () => {
    timerServiceMock = {
      stateSubjectValue: {
        duration: 1800,
        delay: 5,
        intervals: 5,
        startBells: 1,
        startBellInterval: 5,
        endBells: 1,
        endBellInterval: 5,
        isRunning: false
      },
      updateState: jasmine.createSpy('updateState')
    };

    await TestBed.configureTestingModule({
      imports: [TimerSetupComponent, BrowserAnimationsModule],
      providers: [
        { provide: TimerService, useValue: timerServiceMock }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TimerSetupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should update duration', () => {
    component.durationMinutes = 45;
    expect(timerServiceMock.updateState).toHaveBeenCalledWith(jasmine.objectContaining({ duration: 45 * 60 }));
  });

  it('should update delay', () => {
    component.delaySeconds = 10;
    expect(timerServiceMock.updateState).toHaveBeenCalledWith(jasmine.objectContaining({ delay: 10 }));
  });
});
