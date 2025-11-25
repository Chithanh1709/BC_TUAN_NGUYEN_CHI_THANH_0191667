// notification.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Notification {
  type: string;
  message: string;
  orderId?: number;
  customerName?: string;
  totalAmount?: number;
  paymentMethod?: string;
  timestamp?: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  
  private baseUrl = 'http://localhost:8080/api/sse';

  constructor(private http: HttpClient) { }

  // Gửi thông báo đến admin (user ID = 1)
  notifyAdmin(notification: Notification): Observable<any> {
    const adminUserId = 1; // ID của admin
    return this.http.post(`${this.baseUrl}/notify/${adminUserId}`, notification);
  }

  // Gửi thông báo broadcast đến tất cả users
  broadcast(notification: Notification): Observable<any> {
    return this.http.post(`${this.baseUrl}/broadcast`, notification);
  }

  // Subscribe để nhận thông báo real-time
  subscribe(userId: number): EventSource {
    return new EventSource(`${this.baseUrl}/subscribe/${userId}`);
  }
}