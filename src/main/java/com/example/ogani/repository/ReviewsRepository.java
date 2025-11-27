package com.example.ogani.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.example.ogani.models.Reviews;

@Repository
public interface ReviewsRepository extends JpaRepository<Reviews, Long> {
    
    /**
     * Tìm review theo productId và orderId
     */
    @Query("SELECT r FROM Reviews r WHERE r.productId = :productId AND r.orderId.id = :orderId")
    Reviews findByProductIdAndOrderId(
        @Param("productId") Long productId,
        @Param("orderId") Long orderId
    );
    
    /**
     * Lấy rating trung bình theo productId
     */
    @Query(value = "SELECT AVG(r.review_rating) FROM reviews r WHERE r.product_id = :productId", 
           nativeQuery = true)
    Optional<Double> findAverageRatingByProductId(@Param("productId") Long productId);
    
    /**
     * Kiểm tra review đã tồn tại chưa - FIX: Trả về Integer thay vì boolean
     */
    @Query(value = "SELECT COUNT(*) FROM reviews WHERE product_id = :productId AND reviewer_name = :reviewerName AND order_id = :orderId", 
           nativeQuery = true)
    Integer countByProductIdAndReviewerNameAndOrderId(
        @Param("productId") Long productId,
        @Param("reviewerName") String reviewerName,
        @Param("orderId") Long orderId
    );
    
    /**
     * Kiểm tra review đã tồn tại chưa - Method wrapper
     */
    default boolean existsByProductIdAndReviewerNameAndOrderId(Long productId, String reviewerName, Long orderId) {
        Integer count = countByProductIdAndReviewerNameAndOrderId(productId, reviewerName, orderId);
        return count != null && count > 0;
    }
    
    /**
     * Lấy tất cả reviews theo productId
     */
    @Query("SELECT r FROM Reviews r WHERE r.productId = :productId ORDER BY r.reviewDate DESC")
    List<Reviews> findByProductId(@Param("productId") Long productId);
    
    /**
     * Đếm số lượng reviews theo productId
     */
    @Query(value = "SELECT COUNT(*) FROM reviews WHERE product_id = :productId", 
           nativeQuery = true)
    Long countByProductId(@Param("productId") Long productId);
    
    /**
     * Lấy reviews theo rating
     */
    @Query("SELECT r FROM Reviews r WHERE r.productId = :productId AND r.reviewRating = :rating ORDER BY r.reviewDate DESC")
    List<Reviews> findByProductIdAndRating(
        @Param("productId") Long productId,
        @Param("rating") Integer rating
    );
}