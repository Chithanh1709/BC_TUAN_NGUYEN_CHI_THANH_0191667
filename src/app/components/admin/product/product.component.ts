import { Component, OnInit } from '@angular/core';
import { ConfirmationService, MessageService } from 'primeng/api';
import { CategoryService } from 'src/app/_service/category.service';
import { ImageService } from 'src/app/_service/image.service';
import { ProductService } from 'src/app/_service/product.service';
import { CurrencyPipe } from '@angular/common';
// import { VndCurrencyPipe } from 'src/app/_service/pie';

@Component({
  selector: 'app-product',
  templateUrl: './product.component.html',
  styleUrls: ['./product.component.css'],
  providers: [MessageService, ConfirmationService, CurrencyPipe]
})
export class ProductComponent implements OnInit {

  listProduct: any;
  listCategory: any;
  listImage: any;

  disabled: boolean = true;



  selectedFiles?: FileList;
  currentFile?: File;

  listImageChoosen: any = [];
  imageChoosen: any;

  onUpdate: boolean = false;
  showForm: boolean = false;
  showImage: boolean = false;
  showDelete: boolean = false;

  productForm: any = {
    name: null,
    description: null,
    price: null,
    quantity: null,
    content: null,
    categoryId: null,
    imageIds: [],
    unit: null
  };
  unitOptions = [
    // --- Khối lượng ---
    { label: 'Kilogram (Kg)', value: 'KG' },
    { label: 'Gram (g)', value: 'G' },
    // { label: 'Tấn (T)', value: 'TAN' },

    // --- Thể tích ---
    { label: 'Lít (L)', value: 'LIT' },
    { label: 'Mililít (ml)', value: 'ML' },

    // --- Chiều dài (nếu cần) ---
    // { label: 'Mét (m)', value: 'M' },
    // { label: 'Centimet (cm)', value: 'CM' },
    // { label: 'Milimet (mm)', value: 'MM' },

    // --- Đếm / gói ---
    { label: 'Cái', value: 'CÁI' },
    { label: 'Chiếc', value: 'CHIẾC' },
    { label: 'Hộp', value: 'HỘP' },
    { label: 'Lon', value: 'LON' },
    { label: 'Chai', value: 'CHAI' },
    { label: 'Túi', value: 'TÚI' },
    { label: 'Gói', value: 'GÓI' },
    { label: 'Thùng', value: 'THÙNG' },

    // --- Khác ---
    // { label: 'Set/Bộ', value: 'SET' },
    // { label: 'Cặp', value: 'CAP' },
    // { label: 'Đôi', value: 'DOI' }
  ];



  constructor(private messageService: MessageService,
    private productService: ProductService,
    private imageService: ImageService,
    private categoryService: CategoryService) {

  }

  ngOnInit(): void {
    this.getListProduct();
    this.getListCategoryEnabled();
    this.getListImage();
  }

  onInput(event: any) {
    this.productForm.price = event.value; // Cho phép null hoặc trống
    // console.log('Updated price:', this.productForm.price);
  }


  openNew() {
    this.onUpdate = false;
    this.showForm = true;
    this.listImageChoosen = [];
    this.productForm = {
      id: null,
      name: null,
      description: null,
      price: null,
      quantity: null,
      content: null,
      categoryId: null,
      imageIds: []
    }

  }

  // openUpdate(data : any){
  //   this.listImageChoosen = [];
  //     this.onUpdate = true;
  //     this.showForm =true;
  //     this.productForm.id = data.id;
  //     this.productForm.name = data.name;
  //     this.productForm.description = data.description;
  //     this.productForm.price = data.price;  
  //     this.productForm.quantity = data.quantity;
  //     this.productForm.content = data.content;
  //     this.productForm.categoryId = data.categoryId;
  //     data.images.forEach((res : any) =>{
  //       this.listImageChoosen.push(res);
  //     })
  // }


  openUpdate(data: any) {
  this.onUpdate = true;
  this.showForm = true;

  this.productService.getProdct(data.id).subscribe({
    next: res => {
      this.productForm = {
        id: res.id,
        name: res.name,
        description: res.description,
        price: res.price,
        quantity: res.quantity,
        content: res.content,
        categoryId: res.category ? res.category.id : null,
        imageIds: Array.isArray(res.images) ? res.images.map((img: any) => img.id) : []
      };
      this.listImageChoosen = Array.isArray(res.images) ? [...res.images] : [];
      console.log('Updated productForm:', this.productForm); // Log sau khi nhận dữ liệu
    },
    error: err => {
      console.log(err);
    }
  });
}




  onChooseImage() {
    this.showImage = true;
    this.disabled = true;
    let data = document.querySelectorAll('.list-image img');
    data.forEach(i => {
      i.classList.remove('choosen');
    })
  }


  getListProduct() {
    this.productService.getListProduct().subscribe({
      next: res => {
        this.listProduct = res;
        console.log(this.listProduct)
      }, error: err => {
        console.log(err);
      }
    })
  }

  getListCategoryEnabled() {
    this.categoryService.getListCategoryEnabled().subscribe({
      next: res => {
        this.listCategory = res;
      }, error: err => {
        console.log(err);
      }
    })
  }

  getListImage() {
    this.imageService.getList().subscribe({
      next: res => {
        this.listImage = res;
      }, error: err => {
        console.log(err);
      }
    })
  }

  uploadFile(event: any) {
    this.selectedFiles = event.target.files;
    if (this.selectedFiles) {
      const file: File | null = this.selectedFiles.item(0);
      if (file) {
        this.currentFile = file;
        this.imageService.upload(this.currentFile).subscribe({
          next: res => {
            this.currentFile = undefined;
            this.getListImage();
          }, error: err => {
          }
        })
      }
      this.currentFile = undefined;
    }
  }



  createProduct() {
    let data = this.listImageChoosen;
    data.forEach((res: any) => {
      this.productForm.imageIds.push(res.id);
    })
    const { name, description, price, quantity, content, unit, categoryId, imageIds } = this.productForm;
    console.log(this.productForm);
    this.productService.createProduct(name, description, price, quantity, content,unit, categoryId, imageIds).subscribe({
      next: res => {
        this.getListProduct();
        this.showForm = false;
        this.messageService.add({ severity: 'success', summary: 'Thông báo', detail: "Tạo sản phẩm thành công!" });

      }, error: err => {
        this.messageService.add({ severity: 'error', summary: 'Thông báo', detail: err.message });
      }
    })
  }

  // updateProduct(){
  //   let data = this.listImageChoosen;
  //   data.forEach((res: any)=>{
  //     this.productForm.imageIds.push(res.id);
  //   })
  //   const {id,name,description,price,quantity,content,categoryId,imageIds} = this.productForm;
  //   console.log(this.productForm);
  //   this.productService.updateProduct(id,name,description,price,quantity,content,categoryId,imageIds).subscribe({
  //     next: res =>{
  //       this.getListProduct();
  //       this.showForm = false;
  //       this.messageService.add({severity:'success', summary: 'Thông báo', detail: 'Cập nhật thành công!'});
  //     },error: err =>{
  //       this.messageService.add({severity:'error', summary: 'Thông báo', detail: err.message});
  //     }
  //   })

  // }

  updateProduct() {
    // Đảm bảo luôn có imageIds
    this.productForm.imageIds = Array.isArray(this.listImageChoosen)
      ? this.listImageChoosen.map((res: any) => res.id)
      : [];

    // Kiểm tra id trước khi gọi API
    if (!this.productForm.id) {
      this.messageService.add({
        severity: 'error',
        summary: 'Lỗi',
        detail: 'Không tìm thấy ID sản phẩm để cập nhật!'
      });
      return;
    }

    const {
      id,
      name,
      description,
      price,
      quantity,
      content,
      unit,
      categoryId,
      imageIds
    } = this.productForm;

    console.log("Updating product:", this.productForm);

    this.productService
      .updateProduct(id, name, description, price, quantity, content, unit, categoryId, imageIds)
      .subscribe({
        next: res => {
          this.getListProduct();
          this.showForm = false;
          this.messageService.add({
            severity: 'success',
            summary: 'Thông báo',
            detail: 'Cập nhật thành công!'
          });
        },
        error: err => {
          this.messageService.add({
            severity: 'error',
            summary: 'Thông báo',
            detail: err.message
          });
        }
      });
  }


  onDelete(id: number, name: string) {
    this.productForm.id = id; // Gán id trước
    this.productForm.name = name;
    this.showDelete = true;
    console.log('Delete ID:', id); // Debug để kiểm tra
  }

  deleteProduct() {
    this.productService.deleteProduct(this.productForm.id).subscribe({
      next: res => {
        this.getListProduct();
        console.log(res);
        this.messageService.add({ severity: 'warn', summary: 'Thông báo', detail: 'Xóa thành công!' });
        this.showDelete = false;
      }, error: err => {
        this.messageService.add({ severity: 'error', summary: 'Thông báo', detail: err.message });
      }
    })
  }

  chooseImage() {
    this.listImageChoosen.push(this.imageChoosen);
    console.log(this.listImageChoosen);
    this.showImage = false;
  }

  selectImage(event: any, res: any) {
    let data = document.querySelectorAll('.list-image img');
    data.forEach(i => {
      i.classList.remove('choosen');
    })
    event.target.classList.toggle("choosen");
    this.imageChoosen = res;
    this.disabled = false;
  }

  deleteImage() {
    this.listImageChoosen = this.listImageChoosen.filter((img: any) => img.id !== this.imageChoosen.id);
    this.imageChoosen = null;
    this.disabled = true;
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
