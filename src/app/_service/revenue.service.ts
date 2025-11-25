// revenue.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface RevenueStats {
  period: string;
  totalRevenue: number;
}

export interface TopProduct {
  productId: number;
  productName: string;
  totalQuantity: number;
  totalRevenue: number;
}

@Injectable({
  providedIn: 'root'
})
export class RevenueService {
  private baseUrl = 'http://localhost:8080/api/revenue';

  constructor(private http: HttpClient) {}

  getRevenue(type: string): Observable<RevenueStats[]> {
    return this.http.get<RevenueStats[]>(`${this.baseUrl}/stats?type=${type}`);
  }

  getTopProductsByRevenue(): Observable<TopProduct[]> {
    return this.http.get<TopProduct[]>(`${this.baseUrl}/top-products?sortBy=revenue`);
  }

  getTopProductsByQuantity(): Observable<TopProduct[]> {
    return this.http.get<TopProduct[]>(`${this.baseUrl}/top-products?sortBy=quantity`);
  }
}