import { TestBed } from '@angular/core/testing';
import { InstallService } from './install.service';

describe('InstallService', () => {
  let service: InstallService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(InstallService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should detect platform', () => {
    expect(service.platform()).toMatch(/android|ios|desktop|unknown/);
  });

  it('should start with installable false', () => {
    expect(service.installable()).toBeFalse();
  });
});
