import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { StorageService } from 'src/app/_service/storage.service';
import { ReviewService } from 'src/app/_service/review.service';
import { Router } from '@angular/router';


@Component({
  selector: 'app-order-detail-shared',
  templateUrl: './order-detail-shared.component.html',
  styleUrls: ['./order-detail-shared.component.css']
})
export class OrderDetailSharedComponent implements OnInit, OnChanges {

  @Input() order: any;
  @Input() orderItems: any[] = [];
  @Input() isAdmin: boolean = false;
  @Input() isLoading: boolean = false;
  @Output() goBack = new EventEmitter<void>();
  @Output() printOrder = new EventEmitter<void>();
  @Output() statusChange = new EventEmitter<{ orderId: number, action: string }>();

  // Biến mới cho tính năng đánh giá
  showReviewModal = false;
  showViewReviewModal = false;
  selectedProduct: any = null;
  viewingReviewProduct: any = null;
  viewingReview: any = null;
  currentRating = 0;
  reviewComment = '';
  isSubmittingReview = false;
  currentUser: any = null;

  statusMap: { [key: string]: string } = {
    'PENDING': 'Đang chờ thanh toán VNPay',
    'PAID': 'Đã thanh toán',
    'SHIPPING': 'Đang giao',
    'COMPLETED': 'Giao thành công',
    'CONFIRMED': 'Chờ xác nhận',
    'CANCELLED': 'Đã huỷ'
  };

  constructor(
    private storeService: StorageService,
    private reviewService: ReviewService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadCurrentUser();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Khi order hoặc orderItems thay đổi, kiểm tra reviews
    if (changes['order'] || changes['orderItems']) {
      this.checkProductReviews();
    }
  }

  // Phương thức lấy thông tin user hiện tại
  loadCurrentUser(): void {
    try {
      this.currentUser = this.storeService.getUser();
    } catch (error) {
      console.error('Error loading user:', error);
      this.currentUser = null;
    }
  }

  // Kiểm tra đánh giá sản phẩm - chỉ gọi khi có đủ dữ liệu
  checkProductReviews(): void {
    // Chỉ kiểm tra khi order đã load xong và có trạng thái COMPLETED
    if (this.order && this.order.orderStatus === 'COMPLETED' && this.orderItems.length > 0) {

      this.orderItems.forEach((item, index) => {
        // Chỉ kiểm tra nếu sản phẩm chưa có thông tin review
        if (!item.hasReview && item.productId && this.order.id) {
          this.reviewService.getReviewByProductAndOrder(item.productId, this.order.id)
            .subscribe({
              next: (review) => {

                if (review && review.data.id) {
                  // Cập nhật thông tin review
                  this.orderItems[index] = {
                    ...this.orderItems[index],
                    hasReview: true,
                    reviewRating: review.data.reviewRating,
                    reviewComment: review.data.reviewComment,
                    reviewDate: review.data.createdAt,
                    reviewerName: review.data.reviewerName,
                    reviewId: review.data.id
                  };
                }
                // Nếu không có review, giữ nguyên hasReview = false (mặc định)
              },
              error: (error) => {
                console.error(`Error checking review for product ${item.productId}:`, error);
                // Lỗi thì giữ nguyên trạng thái
              }
            });
        }
      });
    }
  }

  // Lấy tên người đánh giá
  getReviewerName(): string {
    if (this.currentUser && this.currentUser.username) {
      return this.currentUser.username;
    }
    return this.getCustomerFullName();
  }

  getStatusText(orderStatus: string): string {
    if (!orderStatus) return 'Không xác định';
    return this.statusMap[orderStatus] || orderStatus;
  }

  getStatusClass(orderStatus: string): string {
    if (!orderStatus) return 'status-unknown';
    return 'status-' + orderStatus.toLowerCase();
  }

  getCustomerFullName(): string {
    if (!this.order) return 'Không xác định';
    const firstName = this.order.firstname || '';
    const lastName = this.order.lastname || '';
    return `${firstName} ${lastName}`.trim() || this.order.user?.email || 'Không xác định';
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('vi-VN') + ' ' + date.toLocaleTimeString('vi-VN');
    } catch (error) {
      return dateString;
    }
  }

  getPaymentDate(): string {
    if (this.order?.payDateTime) {
      return this.order.payDateTime;
    } else if (this.order?.orderStatus === 'PAID') {
      return 'Chưa có thông tin ngày thanh toán';
    } else {
      return 'Chưa thanh toán';
    }
  }

  calculateItemsTotal(): number {
    return this.orderItems.reduce((total, item) => total + (item.subTotal || 0), 0);
  }

  calculateTotalQuantity(): number {
    return this.orderItems.reduce((total, item) => total + (item.quantity || 0), 0);
  }

  isButtonDisabled(orderStatus: string): boolean {
    if (!orderStatus) return true;
    return ['PENDING', 'COMPLETED', 'CANCELLED'].includes(orderStatus);
  }

  onStatusButtonClick(action: string): void {
    if (this.order && this.order.id) {
      this.statusChange.emit({
        orderId: this.order.id,
        action: action
      });
    }
  }

  onGoBack(): void {
    const currentOrderId = this.order?.id; // hoặc lấy từ route param
    if (currentOrderId) {
      // Lưu id đơn hàng vào localStorage để khi quay lại sẽ cuộn tới nó
      localStorage.setItem('lastViewedOrderId', currentOrderId.toString());
    }

    // Điều hướng quay lại trang danh sách
    this.router.navigate(['/admin/order']);
  }


  onPrintOrder(): void {
    this.printOrder.emit();
  }

  // ========== CÁC PHƯƠNG THỨC MỚI CHO TÍNH NĂNG ĐÁNH GIÁ ==========

  openReviewModal(product: any): void {
    if (!this.canReviewProduct(product)) {
      return;
    }

    this.selectedProduct = product;
    this.currentRating = 0;
    this.reviewComment = '';
    this.isSubmittingReview = false;
    this.showReviewModal = true;
  }

  closeReviewModal(): void {
    this.showReviewModal = false;
    this.selectedProduct = null;
    this.currentRating = 0;
    this.reviewComment = '';
    this.isSubmittingReview = false;
  }

  setRating(rating: number): void {
    console.log('Setting rating to:', rating);
    this.currentRating = rating;
  }

  getRatingText(rating: number): string {
    const ratingTexts: { [key: number]: string } = {
      1: 'Rất tệ',
      2: 'Tệ',
      3: 'Bình thường',
      4: 'Tốt',
      5: 'Rất tốt'
    };
    return ratingTexts[rating] || 'Chưa đánh giá';
  }

  onReviewCommentChange(event: any): void {
    this.reviewComment = event.target.value;
  }

  onSubmitReview(): void {
    console.log('Submitting review with rating:', this.currentRating);

    if (!this.selectedProduct || !this.order?.id) {
      alert('Thiếu thông tin sản phẩm hoặc đơn hàng!');
      return;
    }

    if (this.currentRating === 0) {
      alert('Vui lòng chọn số sao đánh giá!');
      return;
    }

    // Kiểm tra lại xem sản phẩm đã được đánh giá chưa
    if (this.hasProductReview(this.selectedProduct)) {
      alert('Sản phẩm này đã được đánh giá!');
      this.closeReviewModal();
      return;
    }

    // Kiểm tra có thông tin user không
    const reviewerName = this.getReviewerName();
    if (!reviewerName) {
      alert('Không thể xác định thông tin người đánh giá!');
      return;
    }

    this.isSubmittingReview = true;

    // Tạo dữ liệu review
    const reviewData = {
      orderId: this.order.id,
      productId: this.selectedProduct.productId,
      rating: this.currentRating,
      comment: this.reviewComment || '',
      reviewerName: reviewerName
    };

    console.log('Review data to send:', reviewData);

    // Gọi service review trực tiếp
    this.reviewService.submitReview(reviewData).subscribe({
      next: (response) => {
        console.log('Đánh giá thành công', response);

        // Cập nhật UI ngay lập tức
        const productIndex = this.orderItems.findIndex(
          (item: any) => item.productId === this.selectedProduct.productId
        );

        if (productIndex !== -1) {
          this.orderItems[productIndex] = {
            ...this.orderItems[productIndex],
            hasReview: true,
            reviewRating: this.currentRating,
            reviewComment: this.reviewComment,
            reviewDate: new Date().toISOString(),
            reviewerName: reviewerName,
            reviewId: response.id
          };
        }

        this.closeReviewModal();
        this.showSuccessMessage('Đánh giá sản phẩm thành công!');
      },
      error: (error) => {
        console.error('Lỗi khi gửi đánh giá', error);
        this.isSubmittingReview = false;

        let errorMessage = 'Có lỗi xảy ra khi gửi đánh giá. Vui lòng thử lại!';
        if (error.error && error.error.message) {
          errorMessage = error.error.message;
        }
        this.showErrorMessage(errorMessage);
      }
    });
  }

  viewReview(product: any): void {
    this.viewingReviewProduct = product;
    this.viewingReview = {
      rating: product.reviewRating,
      comment: product.reviewComment || 'Không có nhận xét',
      createdAt: product.reviewDate || new Date().toISOString(),
      reviewerName: product.reviewerName || this.getReviewerName() || 'Ẩn danh'
    };
    this.showViewReviewModal = true;
  }

  closeViewReviewModal(): void {
    this.showViewReviewModal = false;
    this.viewingReview = null;
    this.viewingReviewProduct = null;
  }

  // Phương thức kiểm tra xem sản phẩm đã được đánh giá chưa
  hasProductReview(product: any): boolean {
    return !!product.hasReview;
  }

  // Phương thức lấy số sao đánh giá
  getProductRating(product: any): number {
    return product.reviewRating || 0;
  }

  // Phương thức kiểm tra xem có thể đánh giá sản phẩm không
  canReviewProduct(product: any): boolean {
    return this.order?.orderStatus === 'COMPLETED' &&
      !this.isAdmin &&
      !this.hasProductReview(product) &&
      !!this.currentUser;
  }

  // Phương thức kiểm tra xem có thể xem đánh giá không
  canViewReview(product: any): boolean {
    return this.order?.orderStatus === 'COMPLETED' &&
      this.hasProductReview(product);
  }

  // Phương thức lấy thông báo trạng thái đánh giá
  getReviewStatusText(product: any): string {
    if (this.hasProductReview(product)) {
      return 'Đã đánh giá';
    } else if (this.order?.orderStatus === 'COMPLETED' && !this.isAdmin) {
      if (!this.currentUser) {
        return 'Vui lòng đăng nhập để đánh giá';
      }
      return 'Chưa đánh giá';
    } else {
      return 'Không thể đánh giá';
    }
  }

  // Phương thức kiểm tra xem user đã đăng nhập chưa
  isUserLoggedIn(): boolean {
    return !!this.currentUser;
  }

  // Hiển thị thông báo thành công
  private showSuccessMessage(message: string): void {
    alert(message);
  }

  // Hiển thị thông báo lỗi
  private showErrorMessage(message: string): void {
    alert(message);
  }
}