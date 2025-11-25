import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

const REPORT_API = "http://localhost:8080/api/report/";

@Injectable({
  providedIn: 'root'
})
export class ReportService {

  constructor(private http: HttpClient) { }

  /**
   * Xuất báo cáo Excel
   * @param month - Tháng (1-12)
   * @param year - Năm
   * @returns Observable với binary data (blob)
   */
  exportExcelReport(month?: number, year?: number): Observable<Blob> {
    let url = REPORT_API + 'excel';
    const params: any = {};
    
    if (month) {
      params.month = month.toString();
    }
    if (year) {
      params.year = year.toString();
    }

    return this.http.get(url, {
      params: params,
      responseType: 'blob'
    });
  }

  /**
   * Xuất báo cáo Excel cho khoảng thời gian
   * @param startDate - Ngày bắt đầu (format: YYYY-MM-DD)
   * @param endDate - Ngày kết thúc (format: YYYY-MM-DD)
   * @returns Observable với binary data (blob)
   */
  exportExcelReportByDateRange(startDate: string, endDate: string): Observable<Blob> {
    const url = REPORT_API + 'excel/range';
    return this.http.get(url, {
      params: {
        startDate: startDate,
        endDate: endDate
      },
      responseType: 'blob'
    });
  }

  /**
   * Download file từ blob
   * @param blob - Blob data
   * @param filename - Tên file
   */
  downloadFile(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  }
}
