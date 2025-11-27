package com.example.ogani.dtos.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChatAiResponse {
    private String reply;
    private List<ProductInfo> relatedProducts;
    private List<OrderInfo> relatedOrders;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProductInfo {
        private Long id;
        private String name;
        private String description;
        private Long price;
        private Integer quantity;
        private String categoryName;
        private String imageUrl;  // ✅ Thêm field ảnh
        private String formattedPrice;  // ✅ Thêm giá đã format
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OrderInfo {
        private Long orderId;
        private String orderStatus;
        private Long totalPrice;
        private LocalDateTime dateOrder;
        private String payMethod;
        private List<OrderDetailInfo> orderDetails;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OrderDetailInfo {
        private String productName;
        private Integer quantity;
        private Long price;
        private Long subTotal;
    }
}