// revenue.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgChartsModule } from 'ng2-charts';

import {
  ChartConfiguration,
  ChartData,
  ChartType
} from 'chart.js';

import { RevenueService, TopProduct } from 'src/app/_service/revenue.service';

@Component({
  selector: 'app-revenue',
  templateUrl: './revenue.component.html',
  styleUrls: ['./revenue.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NgChartsModule
  ]
})
export class RevenueComponent implements OnInit {
  // === Doanh thu theo thời gian ===
  public revenueChartData: ChartData<'bar'> = {
    labels: [],
    datasets: [{
       data:[],
      label: 'Doanh thu (VNĐ)',
      backgroundColor: '#4361ee',
      borderColor: '#3a56d4',
      borderWidth: 1
    }]
  };

  public revenueChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text: 'Doanh thu theo tháng'
      },
      legend: { display: false }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: { display: true, text: 'Doanh thu (VNĐ)' }
      },
      x: {
        title: { display: true, text: 'Thời gian' }
      }
    }
  };

  // === Top theo doanh thu ===
  public topRevenueChartData: ChartData<'bar'> = {
    labels: [],
    datasets: [{
       data:[],
      label: 'Doanh thu (VNĐ)',
      backgroundColor: '#f72585'
    }]
  };

  public topRevenueChartOptions: ChartConfiguration<'bar'>['options'] = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text: 'Top 10 sản phẩm (theo doanh thu)'
      },
      legend: { display: false }
    },
    scales: {
      x: {
        beginAtZero: true,
        ticks: {
          callback: (value: string | number) => {
            if (typeof value === 'number') {
              return this.formatCurrency(value);
            }
            return value;
          }
        },
        title: {
          display: true,
          text: 'Doanh thu (VNĐ)'
        }
      }
    }
  };

  // === Top theo số lượng ===
  public topQuantityChartData: ChartData<'bar'> = {
    labels: [],
    datasets: [{
       data:[],
      label: 'Số lượng',
      backgroundColor: '#4cc9f0'
    }]
  };

  public topQuantityChartOptions: ChartConfiguration<'bar'>['options'] = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text: 'Top 10 sản phẩm (theo số lượng)'
      },
      legend: { display: false }
    },
    scales: {
      x: {
        beginAtZero: true,
        ticks: {
          precision: 0
        },
        title: {
          display: true,
          text: 'Số lượng'
        }
      }
    }
  };

  selectedPeriod: string = 'monthly';
  isExporting = false;
  
  constructor(private revenueService: RevenueService) {}

  ngOnInit(): void {
    this.loadAllCharts();
  }

  loadAllCharts(): void {
    this.loadRevenueChart();
    this.loadTopProducts();
  }

  onPeriodChange(): void {
    console.log('🔄 Người dùng chọn:', this.selectedPeriod);
    this.loadRevenueChart();
  }

  loadRevenueChart(): void {
    this.revenueService.getRevenue(this.selectedPeriod).subscribe({
      next: (data) => {
        const periods = data.map(item => item.period);
        const revenues = data.map(item => item.totalRevenue ?? 0);

        this.revenueChartData = {
          labels: periods,
          datasets: [{
            data:revenues,
            label: 'Doanh thu (VNĐ)',
            backgroundColor: '#4361ee'
          }]
        };

        const periodLabel = this.getPeriodLabel();
        if (this.revenueChartOptions?.plugins?.title) {
          this.revenueChartOptions.plugins.title.text = `Doanh thu theo ${periodLabel}`;
        }
      },
      error: (err) => {
        console.error('❌ Lỗi khi tải doanh thu:', err);
      }
    });
  }

  loadTopProducts(): void {
    // Top theo doanh thu
    this.revenueService.getTopProductsByRevenue().subscribe({
      next: (products) => {
        const names = products.map(p => p.productName || 'Không tên');
        const revenues = products.map(p => p.totalRevenue ?? 0);

        this.topRevenueChartData = {
          labels: names,
          datasets: [{
            data:revenues,
            label: 'Doanh thu',
            backgroundColor: '#f72585'
          }]
        };
      },
      error: (err) => console.error('Lỗi top doanh thu:', err)
    });

    // Top theo số lượng
    this.revenueService.getTopProductsByQuantity().subscribe({
      next: (products) => {
        const names = products.map(p => p.productName || 'Không tên');
        const quantities = products.map(p => p.totalQuantity ?? 0);

        this.topQuantityChartData = {
          labels: names,
          datasets: [{
            data:quantities,
            label: 'Số lượng',
            backgroundColor: '#4cc9f0'
          }]
        };
      },
      error: (err) => console.error('Lỗi top số lượng:', err)
    });
  }

  private getPeriodLabel(): string {
    const map: Record<string, string> = {
      weekly: 'tuần',
      monthly: 'tháng',
      quarterly: 'quý',
      yearly: 'năm'
    };
    return map[this.selectedPeriod] || 'khoảng thời gian';
  }

  private formatCurrency(value: number): string {
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  // Map selectedPeriod sang type cho API
  private getPeriodType(): string {
    const periodMap: { [key: string]: string } = {
      'weekly': 'week',
      'monthly': 'month',
      'quarterly': 'quarter',
      'yearly': 'year'
    };
    return periodMap[this.selectedPeriod] || 'week';
  }

  exportToExcel(): void {
    this.isExporting = true;
    const type = this.getPeriodType();
    const url = `http://localhost:8080/api/excel-report/revenue?type=${type}`;
    
    // Sử dụng fetch để tải file
    fetch(url)
      .then(response => {
        if (!response.ok) {
          throw new Error('Lỗi khi tải báo cáo');
        }
        return response.blob();
      })
      .then(blob => {
        // Tạo URL từ blob
        const blobUrl = window.URL.createObjectURL(blob);
        
        // Tạo link download
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `BaoCaoDoanhThu_${type}_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(link);
        link.click();
        
        // Cleanup
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
        
        this.isExporting = false;
        console.log('✅ Xuất báo cáo thành công');
      })
      .catch(error => {
        console.error('❌ Lỗi khi xuất báo cáo:', error);
        alert('Không thể xuất báo cáo. Vui lòng thử lại!');
        this.isExporting = false;
      });
  }
}