package com.example.ogani.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.example.ogani.models.Order;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ExcelReportRepository extends JpaRepository<Order, Long> {

    // ===== QUERIES CHO EXCEL REPORT - CHI TIẾT SẢN PHẨM =====

    /**
     * Lấy chi tiết sản phẩm theo tuần
     * Format: Tên sản phẩm | Danh mục | Số lượt bán | Số tiền
     */
    @Query(value = """
            SELECT
                p.name AS productName,
                c.name AS categoryName,
                SUM(od.quantity) AS totalQuantity,
                SUM(od.sub_total) AS totalRevenue
            FROM orders o
            INNER JOIN order_detail od ON o.id = od.order_id
            INNER JOIN product p ON od.product_id = p.id
            INNER JOIN category c ON p.category_id = c.id
            WHERE o.order_status IN ('PAID', 'SHIPPING', 'COMPLETED')
            AND o.pay_datetime >= :startDate
            AND o.pay_datetime < :endDate
            GROUP BY p.id, p.name, c.name
            ORDER BY totalRevenue DESC
            """, nativeQuery = true)
    List<Object[]> getProductRevenueByWeek(
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate);

    /**
     * Lấy chi tiết sản phẩm theo tháng
     * Format: Tên sản phẩm | Danh mục | Số lượt bán | Số tiền
     */
    @Query(value = """
            SELECT
                p.name AS productName,
                c.name AS categoryName,
                SUM(od.quantity) AS totalQuantity,
                SUM(od.sub_total) AS totalRevenue
            FROM orders o
            INNER JOIN order_detail od ON o.id = od.order_id
            INNER JOIN product p ON od.product_id = p.id
            INNER JOIN category c ON p.category_id = c.id
            WHERE o.order_status IN ('PAID', 'SHIPPING', 'COMPLETED')
            AND o.pay_datetime >= :startDate
            AND o.pay_datetime < :endDate
            GROUP BY p.id, p.name, c.name
            ORDER BY totalRevenue DESC
            """, nativeQuery = true)
    List<Object[]> getProductRevenueByMonth(
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate);

    /**
     * Lấy chi tiết sản phẩm theo quý
     * Format: Tên sản phẩm | Danh mục | Số lượt bán | Số tiền
     */
    @Query(value = """
            SELECT
                p.name AS productName,
                c.name AS categoryName,
                SUM(od.quantity) AS totalQuantity,
                SUM(od.sub_total) AS totalRevenue
            FROM orders o
            INNER JOIN order_detail od ON o.id = od.order_id
            INNER JOIN product p ON od.product_id = p.id
            INNER JOIN category c ON p.category_id = c.id
            WHERE o.order_status IN ('PAID', 'SHIPPING', 'COMPLETED')
            AND o.pay_datetime >= :startDate
            AND o.pay_datetime < :endDate
            GROUP BY p.id, p.name, c.name
            ORDER BY totalRevenue DESC
            """, nativeQuery = true)
    List<Object[]> getProductRevenueByQuarter(
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate);

    /**
     * Lấy chi tiết sản phẩm theo năm
     * Format: Tên sản phẩm | Danh mục | Số lượt bán | Số tiền
     */
    @Query(value = """
            SELECT
                p.name AS productName,
                c.name AS categoryName,
                SUM(od.quantity) AS totalQuantity,
                SUM(od.sub_total) AS totalRevenue
            FROM orders o
            INNER JOIN order_detail od ON o.id = od.order_id
            INNER JOIN product p ON od.product_id = p.id
            INNER JOIN category c ON p.category_id = c.id
            WHERE o.order_status IN ('PAID', 'SHIPPING', 'COMPLETED')
            AND o.pay_datetime >= :startDate
            AND o.pay_datetime < :endDate
            GROUP BY p.id, p.name, c.name
            ORDER BY totalRevenue DESC
            """, nativeQuery = true)
    List<Object[]> getProductRevenueByYear(
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate);

    // ===== TỔNG DOANH THU THEO PERIOD (cho summary) =====

    /**
     * Tổng doanh thu theo tuần
     */
    @Query(value = """
            SELECT
                CONCAT(YEAR(o.pay_datetime), '-W', LPAD(WEEK(o.pay_datetime, 1), 2, '0')) AS period,
                SUM(o.total_price) AS totalRevenue
            FROM orders o
            WHERE o.order_status IN ('PAID', 'SHIPPING', 'COMPLETED')
            AND o.pay_datetime >= :startDate
            AND o.pay_datetime < :endDate
            GROUP BY CONCAT(YEAR(o.pay_datetime), '-W', LPAD(WEEK(o.pay_datetime, 1), 2, '0'))
            ORDER BY MIN(o.pay_datetime)
            """, nativeQuery = true)
    List<Object[]> getWeeklyRevenue(
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate);

    /**
     * Tổng doanh thu theo tháng
     */
    @Query(value = """
            SELECT
                DATE_FORMAT(o.pay_datetime, '%Y-%m') AS period,
                SUM(o.total_price) AS totalRevenue
            FROM orders o
            WHERE o.order_status IN ('PAID', 'SHIPPING', 'COMPLETED')
            AND o.pay_datetime >= :startDate
            AND o.pay_datetime < :endDate
            GROUP BY DATE_FORMAT(o.pay_datetime, '%Y-%m')
            ORDER BY period
            """, nativeQuery = true)
    List<Object[]> getMonthlyRevenue(
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate);

    /**
     * Tổng doanh thu theo quý
     */
    @Query(value = """
            SELECT
                CONCAT('Q', QUARTER(o.pay_datetime), '-', YEAR(o.pay_datetime)) AS period,
                SUM(o.total_price) AS totalRevenue
            FROM orders o
            WHERE o.order_status IN ('PAID', 'SHIPPING', 'COMPLETED')
            AND o.pay_datetime >= :startDate
            AND o.pay_datetime < :endDate
            GROUP BY CONCAT('Q', QUARTER(o.pay_datetime), '-', YEAR(o.pay_datetime))
            ORDER BY MIN(o.pay_datetime)
            """, nativeQuery = true)
    List<Object[]> getQuarterlyRevenue(
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate);

    /**
     * Tổng doanh thu theo năm
     */
    @Query(value = """
            SELECT
                YEAR(o.pay_datetime) AS period,
                SUM(o.total_price) AS totalRevenue
            FROM orders o
            WHERE o.order_status IN ('PAID', 'SHIPPING', 'COMPLETED')
            AND o.pay_datetime >= :startDate
            AND o.pay_datetime < :endDate
            GROUP BY YEAR(o.pay_datetime)
            ORDER BY period
            """, nativeQuery = true)
    List<Object[]> getYearlyRevenue(
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate);
}
