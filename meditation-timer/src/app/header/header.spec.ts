import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HeaderComponent } from './header.component';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { SettingsService } from '../settings.service';
import { of, Subject } from 'rxjs';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

describe('HeaderComponent', () => {
  let component: HeaderComponent;
  let fixture: ComponentFixture<HeaderComponent>;
  let router: any;
  let settingsService: any;
  let routerEvents: Subject<any>;

  beforeEach(async () => {
    routerEvents = new Subject();
    router = {
      events: routerEvents.asObservable(),
      url: '/',
      navigate: jasmine.createSpy('navigate')
    };

    settingsService = {
      loadSettings: jasmine.createSpy('loadSettings').and.returnValue({ readingPreference: 'all' }),
      saveSettings: jasmine.createSpy('saveSettings')
    };

    await TestBed.configureTestingModule({
      imports: [HeaderComponent, BrowserAnimationsModule],
      providers: [
        { provide: Router, useValue: router },
        { provide: SettingsService, useValue: settingsService },
        { provide: ActivatedRoute, useValue: {} }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(HeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should update isReadingsPage based on router events', fakeAsync(() => {
    component.isReadingsPage = false;

    // Simulate navigation to readings page
    routerEvents.next(new NavigationEnd(1, '/readings', '/readings'));
    tick();
    expect(component.isReadingsPage).toBeTrue();

    // Simulate navigation away
    routerEvents.next(new NavigationEnd(2, '/', '/'));
    tick();
    expect(component.isReadingsPage).toBeFalse();
  }));


  it('should initialize isReadingsPage correctly from initial URL', () => {
    // Re-create component with a different initial URL
    router.url = '/readings';
    const newFixture = TestBed.createComponent(HeaderComponent);
    const newComponent = newFixture.componentInstance;
    newFixture.detectChanges();

    expect(newComponent.isReadingsPage).toBeTrue();
  });
});
