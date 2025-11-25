import { Component, OnInit } from '@angular/core';
import { LayoutService } from './_service/layout.service';
import { StorageService } from './_service/storage.service';


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'ogani';
  showHeaderFooter = true;

  constructor(private layoutService: LayoutService, private storage: StorageService) {}

  ngOnInit(): void {
    this.layoutService.getHeaderFooterVisibility().subscribe(visible => {
      this.showHeaderFooter = visible;
    });
  }
    isUserRole(): boolean {
    const user = this.storage.getUser();
    
    // Hiển thị nếu chưa đăng nhập HOẶC có role USER (không phải ADMIN)
    if (!user) return true; // Guest user
    if (!user.roles) return true;
    
    // Chỉ ẩn với ADMIN
    return !user.roles.includes('ROLE_ADMIN');
  }
}
