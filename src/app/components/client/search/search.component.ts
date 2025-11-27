import { Component, OnInit } from '@angular/core';
import { Router,ActivatedRoute } from '@angular/router';
import { faHeart, faRetweet, faShoppingBag } from '@fortawesome/free-solid-svg-icons';
import { MessageService } from 'primeng/api';
import { CartService } from 'src/app/_service/cart.service';
import { CategoryService } from 'src/app/_service/category.service';
import { ProductService } from 'src/app/_service/product.service';
import { WishlistService } from 'src/app/_service/wishlist.service';

@Component({
  selector: 'app-search',
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.css'],
  providers: [MessageService]

})
export class SearchComponent implements OnInit {


  heart = faHeart;
  bag = faShoppingBag;
  retweet = faRetweet;

  keyword: any;
  listProduct:any;
  listProductNewest:any;
  listCategory :any;
  rangeValues = [0,100];

  // Thêm biến cho checkbox price ranges
  priceRanges = [
    { label: 'Giá dưới 100.000đ', min: 0, max: 100000, checked: false },
    { label: '100.000đ - 200.000đ', min: 100000, max: 200000, checked: false },
    { label: '200.000đ - 300.000đ', min: 200000, max: 300000, checked: false },
    { label: '300.000đ - 500.000đ', min: 300000, max: 500000, checked: false },
    { label: '500.000đ - 1.000.000đ', min: 500000, max: 1000000, checked: false },
    { label: 'Giá trên 1.000.000đ', min: 1000000, max: 999999999, checked: false }
  ];

  allProducts: any[] = []; // Lưu toàn bộ sản phẩm tìm kiếm ban đầu

  constructor(
    private router: Router,
    private categoryService:CategoryService,
    private route:ActivatedRoute,
    private productService: ProductService,
    private cartService: CartService,
    private messageService:MessageService,
    private wishlistService:WishlistService){
    this.router.routeReuseStrategy.shouldReuseRoute = () => false;
  }

  ngOnInit(): void {
    this.keyword = this.route.snapshot.params['keyword'];
    this.getListProduct();
    this.getListCategoryEnabled();
    this.getNewestProduct();
  }

  getListProduct(){
    this.productService.searchProduct(this.keyword).subscribe({
      next:res =>{
        this.listProduct = res;
        this.allProducts = [...res]; // Thêm dòng này để backup
        console.log(this.listProduct);
      },error: err =>{
        console.log(err);
      }
    })
  }

  getListCategoryEnabled(){
    this.categoryService.getListCategoryEnabled().subscribe({
      next: res =>{
        this.listCategory = res;
      },error: err=>{
        console.log(err);
      }
    })
  }

  getNewestProduct(){
    this.productService.getListProductNewest(4).subscribe({
      next:res =>{
        this.listProductNewest = res;
      },error: err =>{
        console.log(err);
      }
    })
  }

  // Thêm method mới cho checkbox
  onPriceRangeChange(): void {
    const checkedRanges = this.priceRanges.filter(range => range.checked);

    if (checkedRanges.length === 0) {
      // Nếu không có range nào được chọn, hiển thị tất cả kết quả tìm kiếm
      this.listProduct = [...this.allProducts];
    } else {
      // Lọc sản phẩm theo các range đã chọn
      this.listProduct = this.allProducts.filter(product => {
        return checkedRanges.some(range => 
          product.price >= range.min && product.price <= range.max
        );
      });
    }
  }

  addToCart(item: any){
    this.cartService.getItems();
    this.cartService.addToCart(item,1);
  }
  
  addToWishList(item: any){
    if(!this.wishlistService.productInWishList(item)){
      this.wishlistService.addToWishList(item);
    }
  }
}
