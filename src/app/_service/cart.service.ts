import { HttpClient } from '@angular/common/http';
import { EventEmitter, Injectable } from '@angular/core';
import { InputText } from 'primeng/inputtext';
import { Observable, of, Subject } from 'rxjs';
import { Router } from '@angular/router';

const ORDER_API = "http://localhost:8080/api/order/";
@Injectable({
  providedIn: 'root'
})
export class CartService {

  items: any[] = [];
  total = 0;

  constructor(
    private http: HttpClient,
    private router: Router
  ) { }

  saveCart(): void {
    localStorage.setItem('cart_items', JSON.stringify(this.items));
    this.calculateTotal(); // Tính lại tổng khi lưu giỏ hàng
  }

  addToCart(item: any, quantity: number) {
    this.loadCart();
    if (!this.productInCart(item)) {
      item.quantity = quantity;
      item.subTotal = item.quantity * item.price;
      this.items.push(item);
    } else {
      this.items.forEach(res => {
        if (res.id == item.id) {
          res.quantity += quantity;
          res.subTotal = res.quantity * res.price;
        }
      });
    }
    item.quantity = quantity;
    this.saveCart();
  }

  updateCart(item: any, quantity: number) {
    this.items.forEach(res => {
      if (res.id == item.id) {
        res.quantity = quantity;
        res.subTotal = res.quantity * res.price;
      }
    });
    this.saveCart(); // Gọi saveCart để tính lại tổng
  }

  productInCart(item: any): boolean {
    return this.items.findIndex((x: any) => x.id == item.id) > -1;
  }

  loadCart(): void {
    this.items = JSON.parse(localStorage.getItem('cart_items') as any) || [];
    this.calculateTotal(); // Tính tổng khi load giỏ hàng
  }

  // Thêm phương thức tính tổng
  calculateTotal(): void {
    this.total = 0;
    this.items.forEach(item => {
      this.total += item.subTotal;
    });
  }

  getItems() {
    return this.items;
  }

  remove(item: any) {
    const index = this.items.findIndex((o: any) => o.id == item.id);
    if (index > -1) {
      this.items.splice(index, 1);
      this.saveCart(); // Gọi saveCart để tính lại tổng
    }
  }

  clearCart() {
    this.items = [];
    this.total = 0;
    localStorage.removeItem('cart_items');
  }

  getInfoCart(): Observable<any[]> {
    return of(this.items);
  }

  checkoutOrder() {
    this.getInfoCart();
    const orderItems = this.items.map(item => ({
      productId: item.id,
      quantity: item.quantity,
    }));
    console.log(orderItems);
    return this.http.post(ORDER_API + 'check', orderItems).subscribe(
      response => {
        console.log('Order placed successfully', response);
        this.router.navigate(['/checkout']);
      },
      error => {
        console.error('Error placing order', error);
      }
    );
  }

  getTotal() {
    return this.total;
  }

 checkOrder(): Observable<any> {
  const orderItems = this.items.map(item => ({
    productId: item.id,
    quantity: item.quantity,
  }));

  return this.http.post(ORDER_API + 'check', orderItems);
}

}