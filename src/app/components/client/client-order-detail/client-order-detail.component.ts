import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { OrderService } from 'src/app/_service/order.service';

@Component({
  selector: 'app-client-order-detail',
  templateUrl: './client-order-detail.component.html'
})
export class ClientOrderDetailComponent implements OnInit {

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
    this.router.navigate(['/my-order']);
  }

  onPrintOrder(): void {
    window.print();
  }
}