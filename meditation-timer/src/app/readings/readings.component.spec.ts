import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReadingsComponent } from './readings.component';
import { SettingsService } from '../settings.service';
import { ConfigService } from '../config.service';
import { of } from 'rxjs';
import { RouterTestingModule } from '@angular/router/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('ReadingsComponent', () => {
  let component: ReadingsComponent;
  let fixture: ComponentFixture<ReadingsComponent>;
  let mockSettingsService: jasmine.SpyObj<SettingsService>;
  let mockConfigService: jasmine.SpyObj<ConfigService>;

  beforeEach(async () => {
    mockSettingsService = jasmine.createSpyObj('SettingsService', ['loadSettings', 'saveSettings'], {
      settings$: of({})
    });
    mockConfigService = jasmine.createSpyObj('ConfigService', [], {
      defaultReadingPreferences: ['BSBC']
    });

    await TestBed.configureTestingModule({
      imports: [ReadingsComponent, RouterTestingModule, NoopAnimationsModule],
      providers: [
        { provide: SettingsService, useValue: mockSettingsService },
        { provide: ConfigService, useValue: mockConfigService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ReadingsComponent);
    component = fixture.componentInstance;
  });

  it('should use config defaults if no settings saved', () => {
    // Mock no saved settings
    mockSettingsService.loadSettings.and.returnValue(null);

    // Trigger ngOnInit
    fixture.detectChanges();

    expect(component.currentPreferences).toEqual(['BSBC']);
  });

  it('should use saved settings if available', () => {
    // Mock saved settings
    mockSettingsService.loadSettings.and.returnValue({ readingPreferences: ['Zen'] });

    // Trigger ngOnInit
    fixture.detectChanges();

    expect(component.currentPreferences).toEqual(['Zen']);
  });

  it('should fallback to all available if no config and no settings', () => {
    // Mock no saved settings and no config
    mockSettingsService.loadSettings.and.returnValue(null);
    Object.defineProperty(mockConfigService, 'defaultReadingPreferences', { value: undefined });

    fixture = TestBed.createComponent(ReadingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.currentPreferences).toEqual(component.availableTypes);
  });
});
