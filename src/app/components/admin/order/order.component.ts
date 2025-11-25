import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { OrderService } from 'src/app/_service/order.service';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import { MessageService } from 'primeng/api';
import Swal from 'sweetalert2';





@Component({
  selector: 'app-order',

  templateUrl: './order.component.html',
  styleUrls: ['./order.component.css'],
  providers: [MessageService]
})
export class OrderComponent implements OnInit, OnDestroy {

  listOrder: any[] = [];
  filteredOrders: any[] = [];
  paginatedOrders: any[] = [];

  // Phân trang
  currentPage: number = 1;
  pageSize: number = 10;
  totalPages: number = 0;

  // Lọc
  selectedStatus: string = '';
  searchTerm: string = '';

  // Thống kê
  statusStats: { [key: string]: number } = {};

  private eventSource: EventSource | null = null;
  private sseUrl = 'http://localhost:8080/api/sse/subscribe/';
  private userId: number = 1; 
  private reconnectInterval: any;
  private isConnected: boolean = false;

  statusMap: { [key: string]: string } = {
    'PENDING': 'Đang chờ thanh toán VNPay',
    'PAID': 'Đã thanh toán',
    'SHIPPING': 'Đang giao',
    'COMPLETED': 'Giao thành công',
    'CONFIRMED': 'Chờ xác nhận',
    'CANCELLED': 'Đã huỷ'
  };

  constructor(
    private orderService: OrderService,
    private router: Router,
    private messageService: MessageService,
    @Inject(PLATFORM_ID) private platformId: any
  ) { }

  ngOnInit(): void {
    this.getListOrder();

    if (isPlatformBrowser(this.platformId)) {
      this.connectToSSE();
    }
  }

  ngOnDestroy(): void {
    this.closeSSEConnection();
    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval);
    }
  }


  // Kết nối SSE 
  connectToSSE(): void {
    try {
      this.closeSSEConnection();
      const user = window.sessionStorage.getItem("auth-user");
      if (user) {
        this.userId = JSON.parse(user).userId;
      }
      this.eventSource = new EventSource(`${this.sseUrl}${this.userId}`);
      this.isConnected = false;

      this.eventSource.onopen = (event) => {
        this.isConnected = true;
      };

      // Lắng nghe sự kiện thông báo mới
      this.eventSource.addEventListener('notification', (event: MessageEvent) => {
        try {
          const notification = JSON.parse(event.data);
          this.handleNewNotification(notification);
        } catch (error) {
          // Không xử lý lỗi
        }
      });

      this.eventSource.onerror = (error) => {
        this.isConnected = false;
        this.handleSSEError();
      };

      // Tự động reconnect sau 10 giây nếu mất kết nối
      this.startAutoReconnect();

    } catch (error) {
      this.handleSSEError();
    }
  }

  // Xử lý thông báo mới
  private handleNewNotification(notification: any): void {
    if (notification.type === 'NEW_ORDER') {
      // Hiển thị alert thông báo đơn hàng mới
      this.showNewOrderAlert(notification);

      // Tải lại danh sách đơn hàng
      setTimeout(() => {
        this.refreshOrderList();
      }, 1000);
    }
  }

  private showNewOrderAlert(notification: any): void {
    const message = notification.message || 'Có đơn hàng mới!';

    Swal.fire({
      title: '📦 Đơn hàng mới!',
      text: message,
      icon: 'success',
      position: 'top-end',
      toast: true, // Thêm dòng này để hiển thị dạng toast nhỏ gọn
      showConfirmButton: true,
      confirmButtonText: 'Xem ngay',
      confirmButtonColor: '#3085d6',
      background: '#f9f9f9',
      color: '#333',
      timer: 5000,
      timerProgressBar: true,
      width: '450px', // Thêm để giới hạn chiều rộng
      showCloseButton: true, // Thêm nút X để đóng
    }).then((result) => {
      if (result.isConfirmed) {
        this.router.navigate(['/admin/order', notification.orderId]);
      }
    });
  }


  // Tải lại danh sách đơn hàng
  private refreshOrderList(): void {
    this.orderService.getListOrder().subscribe({
      next: (res) => {
        this.listOrder = res || [];
        this.applyFilters();
      },
      error: (err) => {
        // Không xử lý lỗi
      }
    });
  }

  // Xử lý lỗi SSE
  private handleSSEError(): void {
    // Không hiển thị thông báo lỗi
  }

  // Tự động reconnect
  private startAutoReconnect(): void {
    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval);
    }

    this.reconnectInterval = setInterval(() => {
      if (!this.isConnected) {
        this.connectToSSE();
      }
    }, 10000);
  }

  // Đóng kết nối SSE
  private closeSSEConnection(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
      this.isConnected = false;
    }
  }

  // Manual reconnect
  manualReconnect(): void {
    this.connectToSSE();
  }

  // Kiểm tra trạng thái kết nối
  get connectionStatus(): string {
    return this.isConnected ? 'connected' : 'disconnected';
  }

  getListOrder(keepPage: boolean = false): void {
    const currentPageBeforeReload = this.currentPage; // lưu trang hiện tại

    this.orderService.getListOrder().subscribe({
      next: res => {
        this.listOrder = res || [];
        this.applyFilters(keepPage, currentPageBeforeReload);
        setTimeout(() => this.scrollToLastViewedOrder(), 500);
      },
      error: err => {
        this.showToast('error', 'Lỗi', 'Không thể tải danh sách đơn hàng');
      }
    });
  }


  applyFilters(keepPage: boolean = false, previousPage: number = 1): void {
    let filtered = this.listOrder;

    // Lọc trạng thái
    if (this.selectedStatus) {
      filtered = filtered.filter(order => order.orderStatus === this.selectedStatus);
    }

    // Lọc tìm kiếm
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(order =>
        (order.id && order.id.toString().includes(term)) ||
        (order.firstname && order.firstname.toLowerCase().includes(term)) ||
        (order.lastname && order.lastname.toLowerCase().includes(term)) ||
        (order.email && order.email.toLowerCase().includes(term)) ||
        (order.phone && order.phone.includes(term))
      );
    }

    this.filteredOrders = filtered;
    this.calculateStats();

    // Giữ lại trang cũ nếu được yêu cầu
    if (keepPage) {
      this.currentPage = previousPage;
    } else {
      this.currentPage = 1;
    }

    this.updatePagination();
  }


  // Tính thống kê
  calculateStats(): void {
    this.statusStats = {};
    this.filteredOrders.forEach(order => {
      const status = order.orderStatus;
      this.statusStats[status] = (this.statusStats[status] || 0) + 1;
    });
  }

  // Phân trang
  updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredOrders.length / this.pageSize);
    this.currentPage = Math.min(this.currentPage, this.totalPages || 1);

    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedOrders = this.filteredOrders.slice(startIndex, endIndex);
  }

  get startIndex(): number {
    return (this.currentPage - 1) * this.pageSize;
  }

  get endIndex(): number {
    return Math.min(this.startIndex + this.pageSize, this.filteredOrders.length);
  }

  getPageNumbers(): number[] {
    const pages = [];
    const maxVisiblePages = 5;

    let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(this.totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  }

  goToPage(page: number): void {
    this.currentPage = page;
    this.updatePagination();
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePagination();
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePagination();
    }
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
    this.updatePagination();
  }

  onStatusFilterChange(): void {
    this.currentPage = 1;
    this.applyFilters();
  }

  onSearch(): void {
    this.currentPage = 1;
    this.applyFilters();
  }

  // Hiển thị toast message
  private showToast(severity: string, summary: string, detail: string): void {
    this.messageService.add({
      severity: severity,
      summary: summary,
      detail: detail,
      life: 3000
    });
  }

  // Các phương thức cũ giữ nguyên
  getStatusText(orderStatus: string): string {
    if (!orderStatus) return 'Không xác định';
    return this.statusMap[orderStatus] || orderStatus;
  }

  getStatusClass(orderStatus: string): string {
    if (!orderStatus) return 'status-unknown';
    return 'status-' + orderStatus.toLowerCase();
  }

  isButtonDisabled(orderStatus: string): boolean {
    if (!orderStatus) return true;
    return ['PENDING', 'COMPLETED', 'CANCELLED'].includes(orderStatus);
  }

  canCancelOrder(orderStatus: string): boolean {
    return orderStatus === 'PENDING';
  }

  onStatusButtonClick(order: any, action: string): void {
    switch (action) {
      case 'confirm':
        if (!this.isButtonDisabled(order.orderStatus)) {
          this.confirmOrder(order.id);
        }
        break;
      case 'ship':
        if (!this.isButtonDisabled(order.orderStatus)) {
          this.shipOrder(order.id);
        }
        break;
      case 'complete':
        if (!this.isButtonDisabled(order.orderStatus)) {
          this.completeOrder(order.id);
        }
        break;
      case 'cancel':
        if (this.canCancelOrder(order.orderStatus)) {
          this.cancelOrder(order.id);
        }
        break;
      default:
      // Không xử lý
    }
  }

  confirmOrder(orderId: number): void {
    this.orderService.confirmOrder(orderId).subscribe({
      next: res => {
        this.showToast('success', 'Thành công', 'Đã xác nhận đơn hàng');
        this.getListOrder(true);
        setTimeout(() => {
          const element = document.getElementById(`order-${orderId}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            element.classList.add('highlight-order'); // thêm hiệu ứng
            setTimeout(() => element.classList.remove('highlight-order'), 2000);
          }
        }, 300);
      },
      error: err => {
        this.showToast('error', 'Lỗi', 'Không thể xác nhận đơn hàng');
      }
    });
  }

  shipOrder(orderId: number): void {
    this.orderService.shipOrder(orderId).subscribe({
      next: res => {
        this.showToast('success', 'Thành công', 'Đã bắt đầu giao hàng');
        this.getListOrder(true);
        setTimeout(() => {
          const element = document.getElementById(`order-${orderId}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            element.classList.add('highlight-order'); // thêm hiệu ứng
            setTimeout(() => element.classList.remove('highlight-order'), 2000);
          }
        }, 300);
      },
      error: err => {
        this.showToast('error', 'Lỗi', 'Không thể bắt đầu giao hàng');
      }
    });
  }

  completeOrder(orderId: number): void {
    this.orderService.completeOrder(orderId).subscribe({
      next: res => {
        this.showToast('success', 'Thành công', 'Đã hoàn thành đơn hàng');
        this.getListOrder(true);
        setTimeout(() => {
          const element = document.getElementById(`order-${orderId}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            element.classList.add('highlight-order'); // thêm hiệu ứng
            setTimeout(() => element.classList.remove('highlight-order'), 2000);
          }
        }, 300);
      },
      error: err => {
        this.showToast('error', 'Lỗi', 'Không thể hoàn thành đơn hàng');
      }
    });
  }

  cancelOrder(orderId: number): void {
    if (confirm('Bạn có chắc chắn muốn huỷ đơn hàng này?')) {
      this.orderService.cancelOrder(orderId).subscribe({
        next: res => {
          this.showToast('success', 'Thành công', 'Đã huỷ đơn hàng');
          this.getListOrder(true);
          setTimeout(() => {
            const element = document.getElementById(`order-${orderId}`);
            if (element) {
              element.scrollIntoView({ behavior: 'smooth', block: 'center' });
              element.classList.add('highlight-order'); // thêm hiệu ứng
              setTimeout(() => element.classList.remove('highlight-order'), 2000);
            }
          }, 300);
        },
        error: err => {
          this.showToast('error', 'Lỗi', 'Không thể huỷ đơn hàng');
        }
      });
    }
  }

  getCustomerFullName(order: any): string {
    if (!order) return 'Không xác định';
    const firstName = order.firstname || '';
    const lastName = order.lastname || '';
    return `${firstName} ${lastName}`.trim() || order.user?.email || 'Không xác định';
  }

  getPaymentDate(order: any): string {
    if (order.payDateTime) {
      return order.payDateTime;
    } else if (order.orderStatus === 'PAID') {
      return 'Chưa có thông tin ngày thanh toán';
    } else {
      return 'Chưa thanh toán';
    }
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('vi-VN') + ' ' + date.toLocaleTimeString('vi-VN');
    } catch (error) {
      return dateString;
    }
  }

  viewOrderDetail(orderId: number): void {
    // Lưu id của đơn hàng vào localStorage
    localStorage.setItem('lastViewedOrderId', orderId.toString());

    // Điều hướng đến trang chi tiết
    this.router.navigate(['/admin/order', orderId]);
  }

  scrollToLastViewedOrder(): void {
    const lastId = localStorage.getItem('lastViewedOrderId');
    if (lastId) {
      const element = document.getElementById(`order-${lastId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.classList.add('highlight-order');
        setTimeout(() => element.classList.remove('highlight-order'), 2000);
      }
      localStorage.removeItem('lastViewedOrderId');
    }
  }


}