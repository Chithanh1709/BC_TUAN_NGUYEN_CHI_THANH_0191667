# Sơ Đồ Sequence - Xuất Excel

```mermaid
sequenceDiagram
    actor User
    participant FE as Frontend
    participant Controller
    participant Service
    participant Repo
    participant DB

    User->>FE: Click xuất Excel
    FE->>Controller: GET /api/excel-report/revenue?type=month
    Controller->>Service: generateRevenueReport(type)
    
    Service->>Service: Tạo Workbook & Sheets theo type
    Note over Service: week: 4-5 sheets<br/>month: 12 sheets<br/>quarter: 4 sheets<br/>year: 1 sheet
    
    loop Mỗi sheet
        Service->>Repo: getProductRevenueByMonth(startDate, endDate)
        Repo->>DB: Query doanh thu sản phẩm
        DB-->>Repo: Dữ liệu
        Repo-->>Service: List<ProductRevenue>
        Service->>Service: Ghi vào Excel (header, data, total)
    end
    
    Service-->>Controller: byte[] excelFile
    Controller-->>FE: File Excel
    FE-->>User: Download file
```

## Query Database
```sql
SELECT p.name, c.name, SUM(od.quantity), SUM(od.sub_total)
FROM orders o
JOIN order_detail od ON o.id = od.order_id
JOIN product p ON od.product_id = p.id
JOIN category c ON p.category_id = c.id
WHERE o.order_status IN ('PAID', 'SHIPPING', 'COMPLETED')
  AND o.pay_datetime BETWEEN :startDate AND :endDate
GROUP BY p.id
ORDER BY totalRevenue DESC
```

## Cấu trúc Excel
```
DOANH THU THÁNG 11/2024
Ngày xuất: 28/11/2024
─────────────────────────────────
STT | Tên | Danh mục | SL | Tiền
─────────────────────────────────
 1  | ... |   ...    | 50 | 500k₫
 2  | ... |   ...    | 30 | 300k₫
─────────────────────────────────
        TỔNG CỘNG     | 80 | 800k₫
```

