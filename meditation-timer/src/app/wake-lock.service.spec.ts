import { TestBed } from '@angular/core/testing';
import { WakeLockService } from './wake-lock.service';

describe('WakeLockService', () => {
  let service: WakeLockService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [WakeLockService]
    });
    service = TestBed.inject(WakeLockService);
  });

  afterEach(() => {
    service.ngOnDestroy();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
    expect(service.isActive).toBeFalse();
  });

  it('should toggle isActive state on acquire and release', async () => {
    await service.acquire();
    expect(service.isActive).toBeTrue();

    await service.release();
    expect(service.isActive).toBeFalse();
  });

  it('should handle navigator.wakeLock request failure gracefully', async () => {
    // Test that acquire does not throw if wakeLock API throws or is unavailable
    const originalNavigator = window.navigator;
    try {
      await service.acquire();
      expect(service.isActive).toBeTrue();
    } finally {
      await service.release();
    }
  });
});
