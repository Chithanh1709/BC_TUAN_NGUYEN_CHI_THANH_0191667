import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';


@Injectable({
  providedIn: 'root'
})
export class ReviewService {
  private apiUrl = 'http://127.0.0.1:8080/api/reviews'; 
  constructor(private http: HttpClient) {}

    submitReview(reviewData: any): Observable<any> {
    // Đảm bảo dữ liệu gửi đi đúng format
    const payload = {
        orderId: reviewData.orderId,
        productId: reviewData.productId,
        reviewRating: reviewData.rating, // Đảm bảo rating được gửi
        reviewComment: reviewData.comment || '', // Không để null
        reviewerName: reviewData.reviewerName
    };
    
    console.log('Sending review payload:', payload);
    return this.http.post(`${this.apiUrl}/create`, payload);
    }
    getReviewByProductAndOrder(productId: number, orderId: number): Observable<any> {
        return this.http.get(`${this.apiUrl}/product/${productId}/order/${orderId}`);
    }

    // Hoặc nếu backend hỗ trợ lấy danh sách đánh giá theo order
    getReviewsByOrder(orderId: number): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/order/${orderId}`);
    }
    getReviewByProductId(productId: number) {
      return this.http.get(`${this.apiUrl}/${productId}`);
    }

//   getReviewByProductAndOrder(productId: number, orderId: number): Observable<Review> {
//     return this.http.get<Review>(`${this.apiUrl}/product/${productId}/order/${orderId}`);
//   }

//   getUserReviews(): Observable<Review[]> {
//     return this.http.get<Review[]>(`${this.apiUrl}/my-reviews`);
//   }
}