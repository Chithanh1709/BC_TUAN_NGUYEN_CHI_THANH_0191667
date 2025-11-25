import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { OrderService } from 'src/app/_service/order.service';

@Component({
  selector: 'app-admin-order-detail',
  templateUrl: './admin-order-detail.component.html',
  styleUrls: ['./admin-order-detail.component.css'] // Có thể bỏ nếu không cần
})
export class AdminOrderDetailComponent implements OnInit {

  order: any;
  orderItems: any[] = [];
  orderId!: number;
  isLoading: boolean = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private orderService: OrderService
  ) { }

  ngOnInit(): void {
    this.orderId = +this.route.snapshot.paramMap.get('id')!;
    this.getOrderDetail();
  }

  getOrderDetail(): void {
    this.isLoading = true;
    this.orderService.getOrderDetail(this.orderId).subscribe({
      next: (res) => {
        if (res && res.length > 0) {
          this.order = res[0].order;
          this.orderItems = res;
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Lỗi khi lấy chi tiết đơn hàng:', err);
        this.isLoading = false;
      }
    });
  }

  onGoBack(): void {
    this.router.navigate(['/admin/order']);
  }

  onPrintOrder(): void {
    window.print();
  }

  onStatusChange(event: {orderId: number, action: string}): void {
    switch (event.action) {
      case 'confirm':
        this.confirmOrder(event.orderId);
        break;
      case 'ship':
        this.shipOrder(event.orderId);
        break;
      case 'complete':
        this.completeOrder(event.orderId);
        break;
    }
  }

  confirmOrder(orderId: number): void {
    this.orderService.confirmOrder(orderId).subscribe({
      next: (res) => {
        console.log('Xác nhận thành công');
        this.getOrderDetail(); // Refresh data
      },
      error: (err) => {
        console.log('Lỗi xác nhận:', err);
      }
    });
  }

  shipOrder(orderId: number): void {
    this.orderService.shipOrder(orderId).subscribe({
      next: (res) => {
        console.log('Bắt đầu giao hàng thành công');
        this.getOrderDetail(); // Refresh data
      },
      error: (err) => {
        console.log('Lỗi bắt đầu giao hàng:', err);
      }
    });
  }

  completeOrder(orderId: number): void {
    this.orderService.completeOrder(orderId).subscribe({
      next: (res) => {
        console.log('Hoàn thành đơn hàng thành công');
        this.getOrderDetail(); // Refresh data
      },
      error: (err) => {
        console.log('Lỗi hoàn thành đơn hàng:', err);
      }
    });
  }
}