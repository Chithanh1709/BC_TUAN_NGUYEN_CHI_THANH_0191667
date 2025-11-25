import { Component, OnInit } from '@angular/core';
import { faBars, faHeart, faPhone, faShoppingBag } from '@fortawesome/free-solid-svg-icons';
import { MessageService } from 'primeng/api';
import { CartService } from 'src/app/_service/cart.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-cart',
  templateUrl: './cart.component.html',
  styleUrls: ['./cart.component.css']
})
export class CartComponent implements OnInit {

  heart = faHeart;
  bag = faShoppingBag;
  phone = faPhone;
  bars = faBars;

  showDepartment = false;

  constructor(public cartService: CartService, private messageService: MessageService, private router: Router) {}

  ngOnInit() {
    // Load giỏ hàng khi component được khởi tạo
    this.cartService.loadCart();
  }

  showDepartmentClick() {
    this.showDepartment = !this.showDepartment;
  }

  removeFromCart(item: any) {
    this.cartService.remove(item);
  }

  updateQuantity(item: any, event: any) {
    let quantity: number = event.target.value;
    if (quantity < 1) {
      quantity = 1;
      event.target.value = 1;
    }
    this.cartService.updateCart(item, quantity);
  }

  plusQuantity(item: any) {
    let quantity = Number(item.quantity);
    this.cartService.updateCart(item, quantity + 1);
  }

  subtractQuantity(item: any) {
    if (item.quantity > 1) {
      let quantity = Number(item.quantity);
      this.cartService.updateCart(item, quantity - 1);
    }
  }

  checkoutOrder() {
  const items = this.cartService.getItems();

  // 🛒 Nếu giỏ hàng trống
  if (items.length === 0) {
    this.messageService.add({
      severity: 'warn',
      summary: 'Cảnh báo',
      detail: '🛒 Giỏ hàng trống! Vui lòng thêm sản phẩm vào giỏ hàng.'
    });
    return;
  }

  // 🧾 Kiểm tra tồn kho qua API
  this.cartService.checkOrder().subscribe({
    next: (res) => {
      // this.messageService.add({
      //   severity: 'success',
      //   summary: 'Xác nhận đơn hàng',
      //   detail: res.message || 'Tất cả sản phẩm đều đủ số lượng tồn.'
      // });

      // 👉 Điều hướng sang trang thanh toán
      setTimeout(() => {
        this.router.navigate(['/checkout']);
      }, 1000);
    },
    error: (err) => {
      
      const errors = err.error?.errors || [err.error?.message || 'Một số sản phẩm không đủ số lượng tồn.'];

      errors.forEach((msg: string) => {
        this.messageService.add({
          severity: 'warn',
          summary: 'Cảnh báo',
          detail: msg
        });
      });
    }
  });
}

}