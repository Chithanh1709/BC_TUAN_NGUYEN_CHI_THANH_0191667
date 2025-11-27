// src/app/services/chat.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ChatMessage {
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
  products?: ProductInfo[];
  orders?: OrderInfo[];
}

export interface ProductInfo {
  id: number;
  name: string;
  description: string;
  price: number;
  quantity: number;
  categoryName: string;
  imageUrl: string;
}

export interface OrderInfo {
  orderId: number;
  orderStatus: string;
  totalPrice: number;
  dateOrder: string;
  payMethod: string;
  orderDetails: OrderDetailInfo[];
}

export interface OrderDetailInfo {
  productName: string;
  quantity: number;
  price: number;
  subTotal: number;
}

export interface ChatRequest {
  message: string;
  userId?: number;
}

export interface ChatResponse {
  reply: string;
  relatedProducts?: ProductInfo[];
  relatedOrders?: OrderInfo[];
}

@Injectable({
  providedIn: 'root'
})

export class ChatService {
  private apiUrl = 'http://localhost:8080/api/chatbot';

  constructor(private http: HttpClient) {}

  sendMessage(message: string, userId?: number): Observable<ChatResponse> {
    const request: ChatRequest = {
      message: message,
      userId: userId
    };
    return this.http.post<ChatResponse>(`${this.apiUrl}/chat`, request);
  }

  checkHealth(): Observable<any> {
    return this.http.get(`${this.apiUrl}/health`);
  }
}