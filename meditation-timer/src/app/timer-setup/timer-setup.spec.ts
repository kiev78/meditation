import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TimerSetup } from './timer-setup';

describe('TimerSetup', () => {
  let component: TimerSetup;
  let fixture: ComponentFixture<TimerSetup>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TimerSetup]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TimerSetup);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
