import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { faFaceLaughWink, faTag } from '@fortawesome/free-solid-svg-icons';
import { faSearch } from '@fortawesome/free-solid-svg-icons'
import { faBell } from '@fortawesome/free-solid-svg-icons'
import { faEnvelope } from '@fortawesome/free-solid-svg-icons'
import { faTachometerAlt } from '@fortawesome/free-solid-svg-icons'
import { faBookmark } from '@fortawesome/free-solid-svg-icons'
import { faReceipt } from '@fortawesome/free-solid-svg-icons'
import { faCartShopping } from '@fortawesome/free-solid-svg-icons'
import { faRocket } from '@fortawesome/free-solid-svg-icons'
import { faUser } from '@fortawesome/free-solid-svg-icons'
import { faBars } from '@fortawesome/free-solid-svg-icons'
import { faPaperPlane } from '@fortawesome/free-solid-svg-icons'
import { faGear } from '@fortawesome/free-solid-svg-icons'
import { faRightFromBracket } from '@fortawesome/free-solid-svg-icons'
import { AuthService } from 'src/app/_service/auth.service';
import { StorageService } from 'src/app/_service/storage.service';




@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
 
})
export class DashboardComponent implements OnInit {
  faceLaugh = faFaceLaughWink;
  search = faSearch
  bell = faBell;
  evelope = faEnvelope;
  tachometer = faTachometerAlt;
  bookmark = faBookmark;
  receipt = faReceipt;
  cart = faCartShopping;
  rocket = faRocket;
  userIcon = faUser;
  paperPlane = faPaperPlane;
  bars = faBars;
  gear = faGear;
  logoutIcon = faRightFromBracket;
  tag = faTag;

  constructor(private storageService: StorageService, private authService: AuthService, private router: Router) { }

  ngOnInit(): void {
    const currentYear = new Date().getFullYear();
    for (let i = currentYear - 5; i <= currentYear + 1; i++) {
      this.years.push(i);
    }
  }


  logout() {
    this.authService.logout().subscribe({
      next: res => {
        this.storageService.clean();
        this.router.navigate(['/']);
      }
    })
  }

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

  years: number[] = [];
  selectedMonth = new Date().getMonth() + 1;
  selectedYear = new Date().getFullYear()

  reportMenu = [
    {
      label: 'Báo cáo bán hàng',
      icon: 'pi pi-shopping-cart',
      command: () => this.exportReport('sales')
    },
    {
      label: 'Báo cáo nhập hàng',
      icon: 'pi pi-truck',
      command: () => this.exportReport('import')
    },
    {
      label: 'Báo cáo lãi/lỗ',
      icon: 'pi pi-dollar',
      command: () => this.exportReport('profit')
    },
    {
      label: 'Báo cáo tồn kho',
      icon: 'pi pi-warehouse',
      command: () => this.exportReport('inventory')
    },
    {
      label: 'Báo cáo tổng hợp',
      icon: 'pi pi-file-excel',
      command: () => this.exportReport('summary')
    }
  ];

  exportReport(type: string) {
    console.log(`Xuất báo cáo: ${type} - Tháng ${this.selectedMonth}/${this.selectedYear}`);
    // TODO: Gọi API backend để xuất file Excel/PDF
  }
  exportReport1() {
    console.log(`Xuất báo cáo: `);  
  }



}