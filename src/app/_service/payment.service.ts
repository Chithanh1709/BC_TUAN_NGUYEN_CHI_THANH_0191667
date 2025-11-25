// src/app/services/vnpay.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';

export interface PaymentRequest {
  amount: number; 
}

export interface PaymentResponse {
  paymentUrl: string;
}

export interface PaymentCallback {
  status: string;
  message: string;
  transactionId?: string;
  orderInfo?: string;
  amount?: string;
  responseCode?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private apiUrl ="http://localhost:8080/api/payment";

  constructor(private http: HttpClient) { }

  createPayment(paymentRequest: PaymentRequest): Observable<PaymentResponse> {
    return this.http.post<PaymentResponse>(`${this.apiUrl}/create-payment`, paymentRequest);
  }

  // Phương thức này có thể được sử dụng nếu bạn muốn kiểm tra trạng thái thanh toán
  getPaymentStatus(params: any): Observable<PaymentCallback> {
    const queryString = this.createQueryString(params);
    return this.http.get<PaymentCallback>(`${this.apiUrl}/payment-callback?${queryString}`);
  }

  private createQueryString(params: any): string {
    return Object.keys(params)
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
      .join('&');
  }
  handlePaymentCallback(data: any): Observable<any> {
    return this.http.get(`${this.apiUrl}/payment-callback?${data}`);
  }

}