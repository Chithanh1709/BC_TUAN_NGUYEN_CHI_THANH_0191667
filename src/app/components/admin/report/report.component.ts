import { Component } from '@angular/core';

@Component({
  selector: 'app-report',
  templateUrl: './report.component.html',
  styleUrls: ['./report.component.css']
})
export class ReportComponent {
  selectedMonth: number | null = null;
  selectedYear: number | null = null;
  years: number[] = [];
  reportTypes = [
    { label: 'Excel', value: 'excel' },
    { label: 'PDF', value: 'pdf' }
    ];
    selectedReportType = this.reportTypes[0].value;
    keyword: string = '';
    months = [
      { value: 1, label: 'Tháng 1' },
      { value: 2, label: 'Tháng 2' },
      { value: 3, label: 'Tháng 3' },
      { value: 4, label: 'Tháng 4' },
      { value: 5, label: 'Tháng 5' },
      { value: 6, label: 'Tháng 6' },
      { value: 7, label: 'Tháng 7' },
      { value: 8, label: 'Tháng 8' },
      { value: 9, label: 'Tháng 9' },
      { value: 10, label: 'Tháng 10' },
      { value: 11, label: 'Tháng 11' },
      { value: 12, label: 'Tháng 12' },
    ];  
    

  constructor() { }


  listReport = [
    { label: 'Xuất báo cáo doanh thu', icon: 'pi pi-file-excel', command: () => this.exportReport('excel') },
    { label: 'Xuất báo cáo đơn hàng', icon: 'pi pi-file-pdf', command: () => this.exportReport('pdf') }
  ];

  exportReport(type: string) {
    if (!this.selectedMonth || !this.selectedYear) {
      alert('Vui lòng chọn tháng và năm để xuất báo cáo.');
      return;
    }
    // Giả sử bạn có một hàm để gọi API backend và nhận file về
    // Ví dụ: this.reportService.exportReport(this.selectedMonth, this.selectedYear, type).subscribe(...)
    // Ở đây chỉ là mô phỏng hành động xuất báo cáo
    console.log(`Xuất báo cáo: ${type} - Tháng ${this.selectedMonth}/${this.selectedYear}`);
    alert(`Báo cáo ${type} cho Tháng ${this.selectedMonth}/${this.selectedYear} đã được xuất!`);
  }

  exportReport1() {
    console.log(`Xuất báo cáo: `);
  }
  
  ngOnInit() {
    const currentYear = new Date().getFullYear();
    for (let year = currentYear; year >= currentYear - 10; year--) {
      this.years.push(year);
    }
  }

}
