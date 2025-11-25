// src/app/services/layout.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LayoutService {
  private showHeaderFooter = new BehaviorSubject<boolean>(true);

  getHeaderFooterVisibility(): Observable<boolean> {
    return this.showHeaderFooter.asObservable();
  }

  setHeaderFooterVisibility(visible: boolean): void {
    this.showHeaderFooter.next(visible);
  }
}