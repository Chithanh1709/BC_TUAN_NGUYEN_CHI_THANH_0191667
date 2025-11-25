import { Component, OnInit } from '@angular/core';
import { OrderService } from 'src/app/_service/order.service';
import { StorageService } from 'src/app/_service/storage.service';
import { Router } from '@angular/router';
import { CartService } from 'src/app/_service/cart.service';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-my-order',
  templateUrl: './my-order.component.html',
  styleUrls: ['./my-order.component.css']
})
export class MyOrderComponent implements OnInit {

  listOrder: any[] = [];
  username: any;
  statusMap: { [key: string]: string } = {
    'PENDING': 'Đang chờ thanh toán VNPay',
    'PAID': 'Đã thanh toán',
    'SHIPPING': 'Đang giao',
    'COMPLETED': 'Giao thành công',
    'CONFIRMED': 'Chờ xác nhận',
    'CANCELLED': 'Đã huỷ'
  };

  constructor(
    private orderService: OrderService,
    private storageService: StorageService,
    private cartService: CartService,
    private router: Router,
    private messageService: MessageService // added
  ) {}

  ngOnInit(): void {
    this.username = this.storageService.getUser().username;
    this.getListOrder();
  }

  getListOrder() {
    this.orderService.getListOrderByUser(this.username).subscribe({
      next: res => {
        this.listOrder = res;
        console.log(this.listOrder);
      }, error: err => {
        console.log(err);
      }
    });
  }

  getStatusText(orderStatus: string): string {
    if (!orderStatus) return 'Không xác định';
    return this.statusMap[orderStatus] || orderStatus;
  }

  getStatusClass(orderStatus: string): string {
    if (!orderStatus) return 'status-unknown';
    return 'status-' + orderStatus.toLowerCase();
  }

  viewOrderDetail(orderId: number): void {
    this.router.navigate(['/order', orderId]);
  }

  getCustomerFullName(order: any): string {
    if (!order) return 'Không xác định';
    const firstName = order.firstname || '';
    const lastName = order.lastname || '';
    return `${firstName} ${lastName}`.trim();
  }

  getProductNames(order: any): string {
    if (!order.orderItems || order.orderItems.length === 0) return 'Không có sản phẩm';
    
    const productNames = order.orderItems.map((item: any) => 
      `${item.product?.name || item.name} (x${item.quantity})`
    );
    return productNames.join(', ');
  }

  // Phương thức tiếp tục thanh toán
  continuePayment(order: any): void {
    if (!order || !order.id) {
      console.error('Order không hợp lệ');
      return;
    }

    // Tạo dữ liệu thanh toán từ đơn hàng
    const paymentData = {
      orderCode: order.id,
      amount: order.totalPrice,
      orderInfo: `Thanh toán đơn hàng $${order.id}`,
      orderType: 'other',
      orderId: order.id
    };

    // Lưu thông tin thanh toán vào sessionStorage
    sessionStorage.setItem('paymentData', JSON.stringify(paymentData));

    // Chuyển đến trang thanh toán
    this.router.navigate(['/payment'], {
      queryParams: {
        orderCode: paymentData.orderCode,
        amount: paymentData.amount,
        orderInfo: paymentData.orderInfo,
        fromOrder: true // Thêm flag để biết là tiếp tục thanh toán từ đơn hàng
      }
    });
  }

  // Kiểm tra xem đơn hàng có thể tiếp tục thanh toán không
  canContinuePayment(order: any): boolean {
    return order && order.orderStatus === 'PENDING';
  }

  // Trả về true nếu đơn hàng ở trạng thái cho phép hủy
  canCancelOrder(order: any): boolean {
    if (!order || !order.orderStatus) return false;
    // Cho phép huỷ khi ở trạng thái PENDING hoặc CONFIRMED; chỉ chặn huỷ ở các trạng thái cuối/không thể đảo ngược
    const nonCancelableStatuses = ['SHIPPING', 'COMPLETED', 'CANCELLED'];
    return !nonCancelableStatuses.includes(order.orderStatus);
  }

  // Gọi service để hủy đơn; thêm xác nhận người dùng trước khi hủy
  cancelOrder(order: any): void {
    if (!order) return;
    const confirmed = window.confirm(`Bạn có chắc muốn hủy đơn hàng #${order.id}?`);
    if (!confirmed) return;

    this.orderService.cancelOrder(order.id).subscribe({
      next: () => {
        // Optimistic UI update
        order.orderStatus = 'CANCELLED';
        // Nếu muốn reload full list: this.getListOrder();
        this.messageService.add({
          severity: 'success',
          summary: 'Thành công',
          detail: `Đã huỷ đơn hàng #${order.id}`
        });
      },
      error: (err) => {
        console.error('Lỗi hủy đơn hàng:', err);
        console.error('Status:', err.status);
        console.error('Message:', err.error?.message || err.statusText);
        this.messageService.add({
          severity: 'error',
          summary: 'Lỗi',
          detail: err.error?.message || 'Không thể huỷ đơn hàng. Vui lòng thử lại.'
        });
      }
    });
  }
}