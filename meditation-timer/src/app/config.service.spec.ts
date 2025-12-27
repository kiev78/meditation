import { TestBed } from '@angular/core/testing';
import { ConfigService } from './config.service';
import { HttpClient } from '@angular/common/http';
import { of, throwError } from 'rxjs';

describe('ConfigService', () => {
  let service: ConfigService;
  let httpClientSpy: jasmine.SpyObj<HttpClient>;

  beforeEach(() => {
    httpClientSpy = jasmine.createSpyObj('HttpClient', ['get']);

    TestBed.configureTestingModule({
      providers: [
        ConfigService,
        { provide: HttpClient, useValue: httpClientSpy }
      ]
    });
    service = TestBed.inject(ConfigService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should load config correctly', async () => {
    const mockConfig = { videoCallUrl: 'https://example.com' };
    httpClientSpy.get.and.returnValue(of(mockConfig));

    await service.loadConfig();

    expect(service.videoCallUrl).toBe('https://example.com');
  });

  it('should handle error when loading config', async () => {
    httpClientSpy.get.and.returnValue(throwError(() => new Error('404')));

    await service.loadConfig();

    expect(service.videoCallUrl).toBeUndefined();
  });
});
