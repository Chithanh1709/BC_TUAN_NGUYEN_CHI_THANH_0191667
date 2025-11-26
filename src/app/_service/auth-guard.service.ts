import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router } from '@angular/router';
import { StorageService } from './storage.service';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthGuardService implements CanActivate {

  isLoggedIn: boolean = false;
  
  // BehaviorSubject để quản lý state authModal
  private authModalState = new BehaviorSubject<boolean>(false);
  public authModal$ = this.authModalState.asObservable();

  constructor(private storageService: StorageService, private router: Router) { }
  
  canActivate(): boolean {
    this.isLoggedIn = this.storageService.isLoggedIn();
    if (this.isLoggedIn == false) {
      // Mở authModal
      this.openAuthModal();
      return false;
    }
    return true;
  }

  // Mở modal
  openAuthModal(): void {
    this.authModalState.next(true);
  }

  // Đóng modal
  closeAuthModal(): void {
    this.authModalState.next(false);
  }

  // Lấy state hiện tại
  getAuthModalState(): boolean {
    return this.authModalState.value;
  }
}
