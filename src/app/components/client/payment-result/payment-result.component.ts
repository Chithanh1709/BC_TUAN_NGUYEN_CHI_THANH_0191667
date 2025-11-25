// src/app/payment-result/payment-result.component.ts
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PaymentService } from 'src/app/_service/payment.service';

@Component({
  selector: 'app-payment-result',
  templateUrl: './payment-result.component.html',
  styleUrls: ['./payment-result.component.css']
})
export class PaymentResultComponent implements OnInit {
  paymentStatus: string = 'processing';
  message: string = 'Đang xử lý kết quả thanh toán...';
  transactionId: string = '';
  amount: string = '';
  orderInfo: string = '';
  isLoading: boolean = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private paymentService: PaymentService
  ) {}

  ngOnInit(): void {
    this.handlePaymentResult();
  }

  handlePaymentResult(): void {
    this.route.queryParams.subscribe({
      next: (params) => {
        console.log('All payment params:', params);
        
        const queryString = new URLSearchParams(params).toString();
        
        if (Object.keys(params).length === 0) {
          this.paymentStatus = 'error';
          this.message = 'Không có thông tin thanh toán';
          this.isLoading = false;
          return;
        }

        // Lấy thông tin từ params
        this.amount = params['vnp_Amount'] || '';
        this.transactionId = params['vnp_TransactionNo'] || '';
        this.orderInfo = params['vnp_OrderInfo'] || '';
        
        console.log('Payment details:', {
          amount: this.amount,
          transactionId: this.transactionId,
          orderInfo: this.orderInfo
        });

        // Xử lý trạng thái thanh toán dựa trên response code và transaction status
        const responseCode = params['vnp_ResponseCode'];
        const transactionStatus = params['vnp_TransactionStatus'];
        const secureHash = params['vnp_SecureHash'];
        // Xác định trạng thái thanh toán
        if (responseCode === '00' && transactionStatus === '00') {
          this.paymentStatus = 'success';
          this.message = 'Cảm ơn bạn đã thanh toán. Giao dịch đã được xử lý thành công.';
        } else if (responseCode === '24') {
          this.paymentStatus = 'failed';
          this.message = 'Giao dịch đã bị hủy bởi người dùng.';
        } else if (responseCode === '09' || responseCode === '10' || responseCode === '11') {
          this.paymentStatus = 'failed';
          this.message = 'Giao dịch thất bại do lỗi kỹ thuật. Vui lòng thử lại.';
        } else {
          this.paymentStatus = 'failed';
          this.message = this.getErrorMessage(responseCode);
        }
        
        this.isLoading = false;

        // Gửi thông tin đến backend để xác nhận
        if (this.paymentStatus === 'success') {
          this.paymentService.handlePaymentCallback(queryString).subscribe({
            next: (response) => {
              console.log('Payment confirmation successful:', response);
            },
            error: (error) => {
              console.error('Payment confirmation failed:', error);
            }
          });
        }
      },
      error: (error) => {
        console.error('Error reading query params:', error);
        this.paymentStatus = 'error';
        this.message = 'Lỗi xử lý thông tin thanh toán';
        this.isLoading = false;
      }
    });
  }

  // Phương thức lấy thông báo lỗi dựa trên response code
  private getErrorMessage(responseCode: string): string {
    const errorMessages: { [key: string]: string } = {
      '07': 'Trừ tiền thành công. Giao dịch bị nghi ngờ (liên quan tới lừa đảo, giao dịch bất thường).',
      '09': 'Giao dịch không thành công do: Thẻ/Tài khoản của khách hàng chưa đăng ký dịch vụ InternetBanking tại ngân hàng.',
      '10': 'Giao dịch không thành công do: Khách hàng xác thực thông tin thẻ/tài khoản không đúng quá 3 lần.',
      '11': 'Giao dịch không thành công do: Đã hết hạn chờ thanh toán. Xin quý khách vui lòng thực hiện lại giao dịch.',
      '12': 'Giao dịch không thành công do: Thẻ/Tài khoản của khách hàng bị khóa.',
      '13': 'Giao dịch không thành công do Quý khách nhập sai mật khẩu xác thực giao dịch (OTP).',
      '24': 'Giao dịch không thành công do: Khách hàng hủy giao dịch.',
      '51': 'Giao dịch không thành công do: Tài khoản của quý khách không đủ số dư để thực hiện giao dịch.',
      '65': 'Giao dịch không thành công do: Tài khoản của Quý khách đã vượt quá hạn mức giao dịch trong ngày.',
      '75': 'Ngân hàng thanh toán đang bảo trì.',
      '79': 'Giao dịch không thành công do: KH nhập sai mật khẩu thanh toán quá số lần quy định.',
      '99': 'Các lỗi khác (lỗi còn lại, không có trong danh sách mã lỗi đã liệt kê).'
    };

    return errorMessages[responseCode] || 'Giao dịch thất bại. Vui lòng liên hệ bộ phận hỗ trợ.';
  }

  formatAmount(amount: string): string {
    if (!amount) return '0';
    
    // VNPay amount là số tiền nhân với 100 (ví dụ: 500000 = 5,000 VND)
    const numericAmount = parseInt(amount);
    const actualAmount = numericAmount / 100;
    
    return new Intl.NumberFormat('vi-VN').format(actualAmount);
  }

  backToHome(): void {
    this.router.navigate(['/']);
  }

  tryAgain(): void {
    // Quay lại trang thanh toán hoặc trang giỏ hàng
    this.router.navigate(['/checkout']);
  }

  printReceipt(): void {
    window.print();
  }
}