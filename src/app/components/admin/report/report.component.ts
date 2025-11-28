import { Component, OnInit } from '@angular/core';
import { ProductService } from 'src/app/_service/product.service';
import { CategoryService } from 'src/app/_service/category.service';
import { MessageService } from 'primeng/api';
import { ChartConfiguration, ChartData } from 'chart.js';

@Component({
  selector: 'app-report',
  templateUrl: './report.component.html',
  styleUrls: ['./report.component.css'],
  providers: [MessageService]
})
export class ReportComponent implements OnInit {

  // Data
  allProducts: any[] = [];
  filteredProducts: any[] = [];
  categories: any[] = [];
  
  // Filters
  keyword: string = '';
  selectedCategory: any = null;
  selectedStatus: string = '';
  
  // Statistics
  lowStockCount: number = 0;
  outOfStockCount: number = 0;
  inStockCount: number = 0;
  totalProducts: number = 0;
  
  // Thresholds
  LOW_STOCK_THRESHOLD = 9;
  OUT_OF_STOCK = 0;
  
  // Stock statuses dropdown
  stockStatuses = [
    { label: 'Hết hàng', value: 'out' },
    { label: 'Sắp hết', value: 'low' },
    { label: 'Còn hàng', value: 'in' }
  ];
  
  // Dialog
  displayUpdateDialog: boolean = false;
  selectedProduct: any = null;
  quantityChange: number = 0;
  updateNote: string = '';
  
  // Charts - Doughnut
  public doughnutChartData: ChartData<'doughnut'> = {
    labels: ['Hết hàng', 'Sắp hết', 'Còn hàng'],
    datasets: [{
      data: [0, 0, 0],
      backgroundColor: ['#ef4444', '#f59e0b', '#10b981'],
      hoverBackgroundColor: ['#dc2626', '#d97706', '#059669'],
      borderWidth: 2,
      borderColor: '#fff'
    }]
  };

  public doughnutChartOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 15,
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.label || '';
            const value = context.parsed || 0;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0) as number;
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${value} sản phẩm (${percentage}%)`;
          }
        }
      }
    }
  };

  // Charts - Bar
  barChartData: any;
  barChartOptions: any;

  constructor(
    private productService: ProductService,
    private categoryService: CategoryService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData() {
    // Load products
    this.productService.getListProduct().subscribe({
      next: (products) => {
        this.allProducts = products;
        this.filteredProducts = products;
        this.calculateStatistics();
        this.updateCharts();
        this.sortProductsByStatus(); // Sắp xếp theo trạng thái
      },
      error: (err) => {
        this.showMessage('error', 'Lỗi', 'Không thể tải dữ liệu sản phẩm');
      }
    });

    // Load categories
    this.categoryService.getListCategory().subscribe({
      next: (categories) => {
        this.categories = categories;
      }
    });
  }

  calculateStatistics(): void {
    this.totalProducts = this.allProducts.length;
    this.outOfStockCount = this.allProducts.filter(p => p.quantity === this.OUT_OF_STOCK).length;
    this.lowStockCount = this.allProducts.filter(p => 
      p.quantity > this.OUT_OF_STOCK && p.quantity <= this.LOW_STOCK_THRESHOLD
    ).length;
    this.inStockCount = this.allProducts.filter(p => p.quantity > this.LOW_STOCK_THRESHOLD).length;
  }

  filterProducts(): void {
    this.filteredProducts = this.allProducts.filter(product => {
      let matchKeyword = true;
      let matchCategory = true;
      let matchStatus = true;

      // Keyword filter
      if (this.keyword) {
        const searchTerm = this.keyword.toLowerCase();
        matchKeyword = product.name.toLowerCase().includes(searchTerm) ||
                      (product.category && product.category.toLowerCase().includes(searchTerm));
      }

      // Category filter - So sánh theo ID hoặc name
      if (this.selectedCategory) {
        // Thử cả 2 cách: theo name và theo ID
        matchCategory = product.category === this.selectedCategory.name ||
                       product.categoryId === this.selectedCategory.id;
      }

      // Status filter
      if (this.selectedStatus) {
        if (this.selectedStatus === 'out') {
          matchStatus = product.quantity === this.OUT_OF_STOCK;
        } else if (this.selectedStatus === 'low') {
          matchStatus = product.quantity > this.OUT_OF_STOCK && 
                       product.quantity <= this.LOW_STOCK_THRESHOLD;
        } else if (this.selectedStatus === 'in') {
          matchStatus = product.quantity > this.LOW_STOCK_THRESHOLD;
        }
      }

      return matchKeyword && matchCategory && matchStatus;
    });

    // Sắp xếp sau khi filter
    this.sortProductsByStatus();
  }

  // Thêm method sắp xếp theo trạng thái
  sortProductsByStatus(): void {
    this.filteredProducts.sort((a, b) => {
      const priorityA = this.getStockPriority(a.quantity);
      const priorityB = this.getStockPriority(b.quantity);
      
      // Sắp xếp theo độ ưu tiên (số nhỏ hơn = ưu tiên cao hơn)
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      
      // Nếu cùng trạng thái, sắp xếp theo số lượng tăng dần
      return a.quantity - b.quantity;
    });
  }

  // Thêm method để xác định độ ưu tiên
  getStockPriority(quantity: number): number {
    if (quantity === this.OUT_OF_STOCK) return 1; // Hết hàng - ưu tiên cao nhất
    if (quantity <= this.LOW_STOCK_THRESHOLD) return 2; // Sắp hết
    return 3; // Còn hàng - ưu tiên thấp nhất
  }

  getStockStatus(quantity: number): string {
    if (quantity === this.OUT_OF_STOCK) return 'Hết hàng';
    if (quantity <= this.LOW_STOCK_THRESHOLD) return 'Sắp hết';
    return 'Còn hàng';
  }

  getStockSeverity(quantity: number): string {
    if (quantity === this.OUT_OF_STOCK) return 'danger';
    if (quantity <= this.LOW_STOCK_THRESHOLD) return 'warning';
    return 'success';
  }

  getStockClass(quantity: number): string {
    if (quantity === this.OUT_OF_STOCK) return 'stock-out';
    if (quantity <= this.LOW_STOCK_THRESHOLD) return 'stock-low';
    return 'stock-in';
  }

  getStockIcon(quantity: number): string {
    if (quantity === this.OUT_OF_STOCK) return 'pi pi-times-circle';
    if (quantity <= this.LOW_STOCK_THRESHOLD) return 'pi pi-exclamation-triangle';
    return 'pi pi-check-circle';
  }

  getRowClass(quantity: number): string {
    if (quantity === this.OUT_OF_STOCK) return 'row-danger';
    if (quantity <= this.LOW_STOCK_THRESHOLD) return 'row-warning';
    return '';
  }

  getProductImage(product: any): string {
    // Kiểm tra nếu có field image (base64 string)
    if (product.image) {
      // Nếu đã có prefix data:image thì return luôn
      if (product.image.startsWith('data:image')) {
        return product.image;
      }
      // Nếu chỉ có base64 string thì thêm prefix
      return `data:image/jpeg;base64,${product.image}`;
    }
    
    // Kiểm tra nếu có field imageUrl
    if (product.imageUrl) {
      if (product.imageUrl.startsWith('data:image')) {
        return product.imageUrl;
      }
      return `data:image/jpeg;base64,${product.imageUrl}`;
    }
    
    // Kiểm tra nếu có mảng images
    if (product.images && product.images.length > 0) {
      const imageData = product.images[0].data;
      if (imageData.startsWith('data:image')) {
        return imageData;
      }
      return `data:image/jpeg;base64,${imageData}`;
    }
    
    // Ảnh mặc định nếu không có
    return 'assets/img/default-product.png';
  }

  updateStock(product: any): void {
    this.selectedProduct = { ...product };
    this.quantityChange = 0;
    this.updateNote = '';
    this.displayUpdateDialog = true;
  }

  confirmUpdateStock(): void {
    if (!this.selectedProduct) return;

    const newQuantity = this.selectedProduct.quantity + this.quantityChange;
    
    if (newQuantity < 0) {
      this.showMessage('error', 'Lỗi', 'Số lượng không thể âm');
      return;
    }

    // Update local data
    const index = this.allProducts.findIndex(p => p.id === this.selectedProduct.id);
    if (index !== -1) {
      this.allProducts[index].quantity = newQuantity;
    }

    this.showMessage('success', 'Thành công', 'Cập nhật tồn kho thành công');
    this.displayUpdateDialog = false;
    this.calculateStatistics();
    this.updateCharts();
    this.filterProducts();
  }

  viewDetails(product: any): void {
    // Navigate to product detail or show dialog
    console.log('View product details:', product);
  }

  updateCharts() {
    // Doughnut Chart - Phân bố trạng thái
    this.doughnutChartData = {
      labels: ['Hết hàng', 'Sắp hết', 'Còn hàng'],
      datasets: [{
        data: [this.outOfStockCount, this.lowStockCount, this.inStockCount],
        backgroundColor: ['#ef4444', '#f59e0b', '#10b981'],
      }]
    };

    this.doughnutChartOptions = {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: 'bottom'
        }
      }
    };

    // Bar Chart - Tồn kho theo sản phẩm
    const topProducts = this.allProducts
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10); // Lấy top 10 sản phẩm có tồn kho cao nhất

    this.barChartData = {
      labels: topProducts.map(p => p.name.length > 20 ? p.name.substring(0, 20) + '...' : p.name),
      datasets: [{
        label: 'Số lượng tồn kho',
        data: topProducts.map(p => p.quantity),
        backgroundColor: '#10b981',
        borderColor: '#059669',
        borderWidth: 1
      }]
    };

    this.barChartOptions = {
      responsive: true,
      maintainAspectRatio: true,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 10
          }
        },
        x: {
          ticks: {
            maxRotation: 45,
            minRotation: 45
          }
        }
      },
      plugins: {
        legend: {
          display: false
        }
      }
    };
  }

  getCategoryStatistics(): any[] {
    const stats: any = {};
    
    this.allProducts.forEach(product => {
      const cat = product.categoryName || 'Khác';
      if (!stats[cat]) {
        stats[cat] = { name: cat, total: 0 };
      }
      stats[cat].total += product.quantity;
    });
    
    return Object.values(stats);
  }

  showMessage(severity: string, summary: string, detail: string): void {
    this.messageService.add({ severity, summary, detail, life: 3000 });
  }
}
