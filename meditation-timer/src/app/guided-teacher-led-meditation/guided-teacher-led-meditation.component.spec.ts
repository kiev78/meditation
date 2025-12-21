import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { GuidedTeacherLedMeditationComponent } from './guided-teacher-led-meditation.component';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSliderModule } from '@angular/material/slider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CommonModule } from '@angular/common';

describe('GuidedTeacherLedMeditationComponent', () => {
  let component: GuidedTeacherLedMeditationComponent;
  let fixture: ComponentFixture<GuidedTeacherLedMeditationComponent>;

  const mockMeditations = [
    {
      teacher: 'Test Teacher',
      title: 'Short test',
      'start-url': '/meditation/test-start.mp3',
      'start-url-duration': '00:30'
    }
  ];

  const mockHttp = {
    get: (_: string) => of(mockMeditations)
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommonModule, MatButtonModule, MatIconModule, MatSliderModule, MatProgressSpinnerModule, GuidedTeacherLedMeditationComponent],
      providers: [
        { provide: 'HttpClient', useValue: mockHttp }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(GuidedTeacherLedMeditationComponent);
    component = fixture.componentInstance;
  });

  it('creates', () => {
    expect(component).toBeTruthy();
  });

  it('loads meditations and selects one on init', (done) => {
    // Replace the internal http with our mock
    (component as any).http = mockHttp;
    component.ngOnInit();

    // Wait a tick for subscription
    setTimeout(() => {
      expect(component.meditations.length).toBeGreaterThan(0);
      expect(component.selected).toBeTruthy();
      done();
    }, 10);
  });
});
