import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { faBars, faHeart, faPhone, faRetweet, faShoppingBag, faStar, faStarHalf, faStar as faStarEmpty } from '@fortawesome/free-solid-svg-icons';
import { MessageService } from 'primeng/api';
import { CartService } from 'src/app/_service/cart.service';
import { ProductService } from 'src/app/_service/product.service';
import { WishlistService } from 'src/app/_service/wishlist.service';
import { ReviewService } from 'src/app/_service/review.service';

@Component({
  selector: 'app-product-detail',
  templateUrl: './product-detail.component.html',
  styleUrls: ['./product-detail.component.css'],
  providers: [MessageService]
})
export class ProductDetailComponent implements OnInit {
  heart = faHeart;
  bag = faShoppingBag;
  phone = faPhone;
  bars = faBars;
  star = faStar;
  star_half = faStarHalf;
  star_empty = faStarEmpty;
  retweet = faRetweet;

  showDepartment = false;

  id: number = 0;
  product: any;
  listRelatedProduct: any[] = [];
  listReviews: any[] = [];
  quantity: number = 1;
  averageRating: number = 0;
  totalReviews: number = 0;

  constructor(
    private productService: ProductService,
    private router: Router,
    private route: ActivatedRoute,
    public cartService: CartService,
    public wishlistService: WishlistService,
    private messageService: MessageService,
    private reviewService: ReviewService
  ) {
    this.router.routeReuseStrategy.shouldReuseRoute = () => false;
  }

  ngOnInit(): void {
    this.id = this.route.snapshot.params['id'];
    this.getProduct();
    this.getReviews();
  }

  showDepartmentClick() {
    this.showDepartment = !this.showDepartment;
  }

  getProduct() {
    this.productService.getProdct(this.id).subscribe({
      next: res => {
        this.product = res;
        this.getListRelatedProduct();
      }, error: err => {
        console.log(err);
      }
    });
  }

  getListRelatedProduct() {
    this.productService.getListRelatedProduct(this.product.category.id).subscribe({
      next: res => {
        this.listRelatedProduct = res;
      }, error: err => {
        console.log(err);
      }
    });
  }

  getReviews() {
    this.reviewService.getReviewByProductId(this.id).subscribe({
      next: (res: any) => {
        this.listReviews = res;
        this.calculateRatingStats();
      },
      error: err => {
        console.log(err);
      }
    });
  }

  calculateRatingStats() {
    if (this.listReviews && this.listReviews.length > 0) {
      this.totalReviews = this.listReviews.length;
      const totalRating = this.listReviews.reduce((sum, review) => sum + review.reviewRating, 0);
      this.averageRating = totalRating / this.totalReviews;
    }
  }

  getStars(rating: number) {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push('full');
    }
    if (hasHalfStar) {
      stars.push('half');
    }
    const emptyStars = 5 - stars.length;
    for (let i = 0; i < emptyStars; i++) {
      stars.push('empty');
    }
    return stars;
  }

  addToCart(item: any) {
    this.cartService.getItems();
    this.cartService.addToCart(item, 1);
    this.showSuccess("Add To Cart Successfully!");
  }

  addCart(item: any) {
    this.cartService.getItems();
    this.cartService.addToCart(item, this.quantity);
    this.showSuccess("Add To Cart Successfully!");
  }

  addToWishList(item: any) {
    if (!this.wishlistService.productInWishList(item)) {
      this.wishlistService.addToWishList(item);
      this.showSuccess("Add To Wishlist Successfully!");
    }
  }

  plusQuantity() {
    this.quantity += 1;
  }

  subtractQuantity() {
    if (this.quantity > 1) {
      this.quantity -= 1;
    }
  }

  showSuccess(text: string) {
    this.messageService.add({ severity: 'success', summary: 'Success', detail: text });
  }

  showError(text: string) {
    this.messageService.add({ severity: 'error', summary: 'Error', detail: text });
  }

  showWarn(text: string) {
    this.messageService.add({ severity: 'warn', summary: 'Warn', detail: text });
  }
}