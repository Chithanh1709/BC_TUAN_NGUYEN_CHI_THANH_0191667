package com.example.ogani.repository;

import com.example.ogani.models.OrderDetail;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface OrderDetailRepository extends JpaRepository<OrderDetail, Long> {
    List<OrderDetail> findByOrderId(Long orderId);
    @Query(value = """
        SELECT 
            p.id AS productId,
            p.name AS productName,
            SUM(od.quantity) AS totalQuantity,
            SUM(od.sub_total) AS totalRevenue
        FROM order_detail od
        JOIN orders o ON od.order_id = o.id
        JOIN product p ON od.product_id = p.id
        WHERE o.order_status IN ('PAID', 'SHIPPING', 'COMPLETED')
        GROUP BY p.id, p.name
        ORDER BY totalRevenue DESC
        LIMIT 10
        """, nativeQuery = true)
    List<Object[]> findTopProductsByRevenue();

    // Top sản phẩm theo SỐ LƯỢNG
    @Query(value = """
        SELECT 
            p.id AS productId,
            p.name AS productName,
            SUM(od.quantity) AS totalQuantity,
            SUM(od.sub_total) AS totalRevenue
        FROM order_detail od
        JOIN orders o ON od.order_id = o.id
        JOIN product p ON od.product_id = p.id
        WHERE o.order_status IN ('PAID', 'SHIPPING', 'COMPLETED')
        GROUP BY p.id, p.name
        ORDER BY totalQuantity DESC
        LIMIT 10
        """, nativeQuery = true)
    List<Object[]> findTopProductsByQuantity();

   
}
