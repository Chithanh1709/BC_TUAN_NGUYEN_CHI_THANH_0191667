// payment.component.ts
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PaymentService } from 'src/app/_service/payment.service';
import { OrderService } from 'src/app/_service/order.service';
import { CartService } from 'src/app/_service/cart.service';

@Component({
  selector: 'app-payment',
  templateUrl: './payment.component.html',
  styleUrls: ['./payment.component.css']
})
export class PaymentComponent implements OnInit {
  isProcessing = false;
  orderData: any = null;
  
  // Dữ liệu thanh toán
  paymentData = {
    orderCode: '',
    amount: 0,
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private paymentService: PaymentService,
    private orderService: OrderService,
    private cartService : CartService
  ) {}

  ngOnInit(): void {
    this.loadPaymentData();
  }

  loadPaymentData(): void {
    this.paymentData.orderCode = this.orderService.getOrderId()
    if(this.paymentData.amount ===0 ){
      const data = sessionStorage.getItem("paymentData")
      if(data)
      this.paymentData = JSON.parse(data)
    }
    console.log(this.paymentData.amount)
  }

  onSubmit(): void {
    if (this.paymentData.amount < 1000) {
      alert('Số tiền thanh toán không hợp lệ');
      return;
    }

    if (!this.paymentData.orderCode) {
      alert('Không tìm thấy mã đơn hàng');
      return;
    }

    this.isProcessing = true;

    const paymentRequest = {
      amount: this.paymentData.amount,
      orderType: '250000',
      orderInfo: ''
    };

    paymentRequest.orderInfo += this.paymentData.orderCode
    console.log('Submitting payment:', paymentRequest);

    this.paymentService.createPayment(paymentRequest).subscribe({
      next: (response) => {
        if (response) {
          console.log('Payment URL received:', response);
          window.location.href = response.paymentUrl;
        } else {
          alert('Lỗi: ' + response);
          this.isProcessing = false;
        }
      },
      error: (error) => {
        console.error('Payment creation error:', error);
        this.isProcessing = false;
        
        if (error.status === 403) {
          alert('Lỗi truy cập (403). Vui lòng kiểm tra kết nối.');
        } else if (error.status === 400) {
          alert('Dữ liệu không hợp lệ: ' + (error.error?.message || 'Vui lòng kiểm tra lại thông tin.'));
        } else {
          alert('Có lỗi xảy ra khi tạo thanh toán: ' + (error.error?.message || error.message));
        }
      }
    });
  }

  formatAmount(amount: number): string {
    return new Intl.NumberFormat('vi-VN').format(amount);
  }

  backToCheckout(): void {
    this.router.navigate(['/checkout']);
  }

  // Kiểm tra dữ liệu hợp lệ
  get isValid(): boolean {
    return this.paymentData.amount >= 1000 && 
           this.paymentData.orderCode !== '' 
  }
}