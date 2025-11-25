import { Component, OnInit } from '@angular/core';
import { faBars, faHeart, faPhone, faShoppingBag } from '@fortawesome/free-solid-svg-icons';
import { MessageService } from 'primeng/api';
import { OrderDetail } from 'src/app/_class/order-detail';
import { Router } from '@angular/router';
import { CartService } from 'src/app/_service/cart.service';
import { OrderService } from 'src/app/_service/order.service';
import { StorageService } from 'src/app/_service/storage.service';
import { NotificationService } from 'src/app/_service/notification.service'; // Thêm service mới

@Component({
  selector: 'app-checkout',
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.css'],
  providers: [MessageService]
})
export class CheckoutComponent implements OnInit {
  heart = faHeart;
  bag = faShoppingBag;
  phone = faPhone;
  bars = faBars;

  showDepartment = false;
  username: string = '';
  paymentMethod: string = 'COD';

  orderForm = {
    firstname: '',
    lastname: '',
    country: '',
    address: '',
    town: '',
    state: '',
    postCode: '',
    email: '',
    phone: '',
    note: ''
  }

  constructor(
    public cartService: CartService,
    private orderService: OrderService,
    private storageService: StorageService,
    public messageService: MessageService,
    private router: Router,
    private notificationService: NotificationService // Thêm service
  ) { }

  ngOnInit(): void {
    this.username = this.storageService.getUser().username;
    this.cartService.loadCart();
    this.cartService.getItems();
  }

  showDepartmentClick(): void {
    this.showDepartment = !this.showDepartment;
  }

  selectPayment(method: string): void {
    this.paymentMethod = method;
  }

  placeOrder(): void {
    if (!this.isFormValid()) {
      this.messageService.add({
        severity: 'error',
        summary: 'Lỗi',
        detail: 'Vui lòng nhập đầy đủ thông tin bắt buộc!'
      });
      return;
    }

    const orderDetails = this.prepareOrderDetails();
    this.orderService.placeOrder(
      this.orderForm.firstname,
      this.orderForm.lastname,
      this.orderForm.country,
      this.orderForm.address,
      this.orderForm.town,
      this.orderForm.state,
      this.orderForm.postCode,
      this.orderForm.phone,
      this.orderForm.email,
      this.orderForm.note,
      orderDetails,
      this.username,
      this.paymentMethod
    ).subscribe({
      next: (res) => {
        console.log('Order response:', res);
        this.orderService.setOrderId(res.OrderId);

        // Gửi thông báo đến admin
        this.notifyAdminAboutNewOrder(res);

        this.handleOrderSuccess(res);
      },
      error: (err) => {
        this.handleOrderError(err);
      }
    });
  }

  // Gửi thông báo đến admin về đơn hàng mới
  private notifyAdminAboutNewOrder(orderResponse: any): void {
    const notification = {
      type: 'NEW_ORDER',
      message: `🆕 Có đơn hàng mới #${orderResponse.OrderId || orderResponse.id} từ ${this.orderForm.firstname} ${this.orderForm.lastname}`,
      orderId: orderResponse.OrderId || orderResponse.id,
      customerName: `${this.orderForm.firstname} ${this.orderForm.lastname}`,
      totalAmount: this.cartService.getTotal(),
      paymentMethod: this.paymentMethod,
      timestamp: new Date().toISOString()
    };

    // Gửi thông báo qua service
    this.notificationService.notifyAdmin(notification).subscribe({
      next: () => {
        console.log('✅ Notification sent to admin');
      },
      error: (err) => {
        console.error('❌ Failed to send notification:', err);
      }
    });
  }

  private isFormValid(): boolean {
    const requiredFields = [
      this.orderForm.firstname,
      this.orderForm.lastname,
      this.orderForm.address,
      this.orderForm.town,
      this.orderForm.phone,
      this.orderForm.email
    ];
    return requiredFields.every(field => field && field.trim() !== '');
  }

  private prepareOrderDetails(): OrderDetail[] {
    return this.cartService.items.map(item => {
      const orderDetail = new OrderDetail();
      orderDetail.name = item.name;
      orderDetail.price = item.price;
      orderDetail.quantity = item.quantity;
      orderDetail.subTotal = item.subTotal;
      orderDetail.productId = item.id;
      orderDetail.payMethod = this.paymentMethod;
      return orderDetail;
    });
  }

  private handleOrderSuccess(response: any): void {
    this.messageService.add({
      severity: 'success',
      summary: 'Thành công',
      detail: 'Đặt hàng thành công!'
    });

    // ✅ Tính tổng trước khi xóa
    this.cartService.calculateTotal();
    const totalAmount = this.cartService.getTotal();

    setTimeout(() => {
      if (this.paymentMethod === 'VNPay') {
        this.navigateToPayment(response, totalAmount); // ✅ Truyền total qua đây
      } else {
        this.cartService.clearCart();
        this.router.navigate(['/my-order']);
      }
    }, 1500);
  }


  private handleOrderError(error: any): void {
    console.error('Order error:', error);
    this.messageService.add({
      severity: 'error',
      summary: 'Lỗi',
      detail: 'Có lỗi xảy ra khi đặt hàng!'
    });
  }

  private navigateToPayment(orderResponse: any, totalAmount: number): void {
    const orderCode = orderResponse.OrderId || this.generateOrderCode();

    const paymentData = {
      orderCode: orderCode,
      amount: totalAmount,
      orderInfo: `Thanh toán đơn hàng ${orderCode}`,
      orderType: 'other',
      orderId: orderResponse.id || orderResponse.orderId
    };

    sessionStorage.setItem('paymentData', JSON.stringify(paymentData));
    this.cartService.clearCart(); // ✅ Chỉ xóa ở đây sau khi lưu paymentData
    this.router.navigate(['/payment'], {
      queryParams: {
        orderCode: paymentData.orderCode,
        amount: paymentData.amount,
        orderInfo: paymentData.orderInfo
      }
    });
  }


  private generateOrderCode(): string {
    return 'ORD' + Date.now();
  }

  // Helper methods cho template
  getOrderButtonText(): string {
    return this.paymentMethod === 'VNPay'
      ? 'Đặt hàng & Thanh toán VNPay'
      : 'Đặt hàng (COD)';
  }

  getOrderButtonIcon(): string {
    return this.paymentMethod === 'VNPay'
      ? 'pi pi-credit-card'
      : 'pi pi-shopping-cart';
  }
}