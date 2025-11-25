// import { Injectable } from '@angular/core';
// import { Stomp } from '@stomp/stompjs';
// import * as SockJS from 'sockjs-client';
// import { Subject, Observable } from 'rxjs';
// import { Order } from '../_class/order';

// @Injectable({
//   providedIn: 'root'
// })
// export class OrderSocketService {
//   private stompClient: any;
//   private newOrderSubject = new Subject<any>(); // Cho thông báo mới
//   private ordersSubject = new Subject<Order>(); // Sửa: Emit single Order thay vì array

//   connect(): void {
//     const socket = new SockJS('http://localhost:8080/ws'); // Thay localhost:8080 bằng URL backend
//     this.stompClient = Stomp.over(socket);

//     this.stompClient.connect({}, 
//       (frame: any) => { // Sửa: Thêm type cho frame nếu cần
//         console.log('WebSocket connected!', frame);

//         // Subscribe topic thông báo đơn mới (cho notification/toast)
//         this.stompClient.subscribe('/topic/newOrder', (message: any) => {
//           const data = JSON.parse(message.body);
//           this.newOrderSubject.next(data); // Emit { message: "Có đơn hàng mới", orderId: 123 }
//         });

//         // Subscribe topic update orders (cho add vào list)
//         this.stompClient.subscribe('/topic/orders', (message: any) => {
//           const newOrder = JSON.parse(message.body) as Order;
//           this.ordersSubject.next(newOrder); // Emit full order object (single)
//         });
//       }, 
//       (error: any) => {
//         console.error('WebSocket error:', error);
//         // Reconnect logic nếu cần (ví dụ: setTimeout để thử lại sau 5s)
//         // setTimeout(() => this.connect(), 5000);
//       }
//     );
//   }

//   disconnect(): void {
//     if (this.stompClient) {
//       this.stompClient.disconnect(() => {
//         console.log('WebSocket disconnected');
//       });
//     }
//   }

//   // Observable cho component subscribe
//   getNewOrderNotifications(): Observable<any> {
//     return this.newOrderSubject.asObservable();
//   }

//   getOrderUpdates(): Observable<Order> {
//     return this.ordersSubject.asObservable();
//   }
// }