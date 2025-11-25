import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OrderDetailSharedComponent } from './order-detail-shared.component';

describe('OrderDetailSharedComponent', () => {
  let component: OrderDetailSharedComponent;
  let fixture: ComponentFixture<OrderDetailSharedComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ OrderDetailSharedComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OrderDetailSharedComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
