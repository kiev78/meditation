import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of } from 'rxjs';
import { GuidedTeacherLedMeditationComponent } from './guided-teacher-led-meditation.component';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSliderModule } from '@angular/material/slider';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { TimerService } from '../timer.service';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { SimpleChange } from '@angular/core';

describe('GuidedTeacherLedMeditationComponent', () => {
  let component: GuidedTeacherLedMeditationComponent;
  let fixture: ComponentFixture<GuidedTeacherLedMeditationComponent>;
  let timerService: jasmine.SpyObj<TimerService>;

  const mockMeditations = [
    { title: 'Meditation 1', teacher: 'A', 'start-url': 'url1', 'start-url-duration': '05:00' },
    { title: 'Meditation 2', teacher: 'A', 'start-url': 'url2', 'start-url-duration': '10:00' },
    { title: 'Meditation 3', teacher: 'B', 'start-url': 'url3', 'start-url-duration': '10:00' },
    { title: 'Meditation 4', teacher: 'B', 'start-url': 'url4', 'start-url-duration': '15:00' },
  ];

  const mockHttp = {
    get: (_: string) => of(mockMeditations)
  };

  beforeEach(async () => {
    const timerServiceSpy = jasmine.createSpyObj('TimerService', ['seek', 'state$'], { stateSubjectValue: {}, state$: of({}) });

    await TestBed.configureTestingModule({
      imports: [
        CommonModule,
        MatButtonModule,
        MatIconModule,
        MatSliderModule,
        GuidedTeacherLedMeditationComponent,
        NoopAnimationsModule
      ],
      providers: [
        { provide: HttpClient, useValue: mockHttp },
        { provide: TimerService, useValue: timerServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(GuidedTeacherLedMeditationComponent);
    component = fixture.componentInstance;
    timerService = TestBed.inject(TimerService) as jasmine.SpyObj<TimerService>;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load meditations and select the first one on init', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    expect(component.meditations.length).toBe(4);
    expect(component.filteredMeditations.length).toBe(4);
    expect(component.selected).toEqual(mockMeditations[0]);
    expect(component.currentIndex).toBe(0);
  }));

  it('should filter meditations by time', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    component.time = 10;
    component.ngOnChanges({
        time: new SimpleChange(null, 10, true)
    });
    fixture.detectChanges();

    expect(component.filteredMeditations.length).toBe(3);
    expect(component.filteredMeditations[0].title).toBe('Meditation 1');
    expect(component.filteredMeditations[1].title).toBe('Meditation 2');
    expect(component.filteredMeditations[2].title).toBe('Meditation 3');
  }));

  it('should play the next meditation when playNext() is called', fakeAsync(() => {
    fixture.detectChanges();
    tick();
  
    expect(component.currentIndex).toBe(0);
    expect(component.selected).toEqual(mockMeditations[0]);
  
    component.playNext();
  
    expect(component.currentIndex).toBe(1);
    expect(component.selected).toEqual(mockMeditations[1]);
  }));

  it('should loop to the beginning when playNext() is called on the last meditation', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    
    component.currentIndex = mockMeditations.length - 1;
    component.selected = mockMeditations[mockMeditations.length - 1];
  
    component.playNext();
  
    expect(component.currentIndex).toBe(0);
    expect(component.selected).toEqual(mockMeditations[0]);
  }));

  it('should play the previous meditation when playPrevious() is called', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    component.currentIndex = 1;
    component.selected = mockMeditations[1];

    component.playPrevious();

    expect(component.currentIndex).toBe(0);
    expect(component.selected).toEqual(mockMeditations[0]);
  }));

  it('should loop to the end when playPrevious() is called on the first meditation', fakeAsync(() => {
    fixture.detectChanges();
    tick();
  
    component.playPrevious();
  
    expect(component.currentIndex).toBe(mockMeditations.length - 1);
    expect(component.selected).toEqual(mockMeditations[mockMeditations.length - 1]);
  }));

  it('should disable next/prev buttons when only one meditation is available', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    component.time = 5;
    component.ngOnChanges({
        time: new SimpleChange(null, 5, true)
    });
    fixture.detectChanges();

    expect(component.filteredMeditations.length).toBe(1);

    const buttonRow = fixture.nativeElement.querySelector('.button-row');
    const prevButton = buttonRow.children[3];
    const nextButton = buttonRow.children[4];

    expect(prevButton.disabled).toBeTrue();
    expect(nextButton.disabled).toBeTrue();
  }));
});