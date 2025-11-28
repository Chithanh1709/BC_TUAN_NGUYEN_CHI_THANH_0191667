# Use Case Diagram - Hệ Thống Ogani

```mermaid
graph TB
    subgraph Actors
        User[👤 Khách hàng]
        Admin[👨‍💼 Admin]
    end

    subgraph "Quản lý Sản phẩm"
        UC1[Xem danh sách sản phẩm]
        UC2[Tìm kiếm sản phẩm]
        UC3[Xem chi tiết sản phẩm]
        UC4[Thêm/Sửa/Xóa sản phẩm]
        UC5[Quản lý danh mục]
        UC6[Đánh giá sản phẩm]
    end

    subgraph "Quản lý Đơn hàng"
        UC7[Đặt hàng]
        UC8[Thanh toán VNPay]
        UC9[Thanh toán COD]
        UC10[Xem đơn hàng của tôi]
        UC11[Quản lý đơn hàng]
        UC12[Xác nhận đơn hàng]
        UC13[Cập nhật trạng thái]
    end

    subgraph "Quản lý Tài khoản"
        UC14[Đăng ký]
        UC15[Đăng nhập]
        UC16[Quên mật khẩu]
        UC17[Quản lý người dùng]
    end

    subgraph "Báo cáo & Thống kê"
        UC18[Xem doanh thu]
        UC19[Xuất báo cáo Excel]
        UC20[Thống kê theo thời gian]
    end

    subgraph "Nội dung & Hỗ trợ"
        UC21[Quản lý Blog]
        UC22[Chat với AI]
        UC23[Nhận thông báo]
        UC24[Quản lý hình ảnh]
    end

    User --> UC1
    User --> UC2
    User --> UC3
    User --> UC6
    User --> UC7
    User --> UC8
    User --> UC9
    User --> UC10
    User --> UC14
    User --> UC15
    User --> UC16
    User --> UC22
    User --> UC23

    Admin --> UC4
    Admin --> UC5
    Admin --> UC11
    Admin --> UC12
    Admin --> UC13
    Admin --> UC17
    Admin --> UC18
    Admin --> UC19
    Admin --> UC20
    Admin --> UC21
    Admin --> UC24
    Admin --> UC23

    UC8 -.include.-> UC7
    UC9 -.include.-> UC7
    UC12 -.extend.-> UC11
    UC13 -.extend.-> UC11
```

## Chi tiết Use Cases

### 👤 Khách hàng
- **Sản phẩm**: Xem, tìm kiếm, chi tiết, đánh giá
- **Đơn hàng**: Đặt hàng, thanh toán (VNPay/COD), theo dõi
- **Tài khoản**: Đăng ký, đăng nhập, quên mật khẩu
- **Khác**: Chat AI, nhận thông báo

### 👨‍💼 Admin
- **Sản phẩm**: CRUD sản phẩm, quản lý danh mục, hình ảnh
- **Đơn hàng**: Xem tất cả, xác nhận, cập nhật trạng thái
- **Báo cáo**: Xem doanh thu, xuất Excel, thống kê
- **Hệ thống**: Quản lý user, blog, thông báo
