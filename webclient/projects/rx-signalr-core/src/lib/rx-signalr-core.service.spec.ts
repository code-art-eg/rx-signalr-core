import { TestBed } from '@angular/core/testing';

import { RxSignalrCoreService } from './rx-signalr-core.service';

describe('RxSignalrCoreService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: RxSignalrCoreService = TestBed.get(RxSignalrCoreService);
    expect(service).toBeTruthy();
  });
});
