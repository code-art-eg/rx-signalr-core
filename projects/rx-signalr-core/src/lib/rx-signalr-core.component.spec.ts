import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { RxSignalrCoreComponent } from './rx-signalr-core.component';

describe('RxSignalrCoreComponent', () => {
  let component: RxSignalrCoreComponent;
  let fixture: ComponentFixture<RxSignalrCoreComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ RxSignalrCoreComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(RxSignalrCoreComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
