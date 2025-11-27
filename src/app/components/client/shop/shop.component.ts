import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { faHeart, faRetweet, faShoppingBag } from '@fortawesome/free-solid-svg-icons';
import { MessageService } from 'primeng/api';
import { CartService } from 'src/app/_service/cart.service';
import { CategoryService } from 'src/app/_service/category.service';
import { ProductService } from 'src/app/_service/product.service';
import { WishlistService } from 'src/app/_service/wishlist.service';

@Component({
  selector: 'app-shop',
  templateUrl: './shop.component.html',
  styleUrls: ['./shop.component.css'],
  providers: [MessageService]
})
export class ShopComponent implements OnInit {

  heart = faHeart;
  bag = faShoppingBag;
  retweet = faRetweet;

  id: number = 0;
  listProduct : any;
  listCategory : any;
  listProductNewest : any[] = [];

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

  allProducts: any[] = []; // Lưu toàn bộ sản phẩm ban đầu

  constructor(
    private categoryService:CategoryService,
    private productService: ProductService,
    private router: Router,
    private route: ActivatedRoute,
    public cartService:CartService,
    public wishlistService:WishlistService){
    this.router.routeReuseStrategy.shouldReuseRoute = () => false;
  }

  ngOnInit(): void {
    this.id = this.route.snapshot.params['id'];
    this.getListProductByCategory();
    this.getListCategoryEnabled();
    this.getNewestProduct();
  }

  getListProductByCategory(){
    this.productService.getListByCategory(this.id).subscribe({
      next: res =>{
        this.listProduct = res;
        this.allProducts = [...res]; // Backup sản phẩm ban đầu
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
        console.log(res[0].images);
        this.listProductNewest = res;
      },error: err =>{
        console.log(err);
      }
    })
  }

  getListProductByPriceRange(){
    this.productService.getListByPriceRange(this.id,this.rangeValues[0],this.rangeValues[1]).subscribe({
      next: res =>{
        this.listProduct = res;
        console.log(this.listProduct);
      },error: err =>{
        console.log(err);
      }
    })
  }

  // Thêm method mới cho checkbox
  onPriceRangeChange(): void {
    const checkedRanges = this.priceRanges.filter(range => range.checked);

    if (checkedRanges.length === 0) {
      // Nếu không có range nào được chọn, hiển thị tất cả sản phẩm
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
