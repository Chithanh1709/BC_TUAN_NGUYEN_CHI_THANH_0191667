package com.example.ogani.dtos.response;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class ChatAiResponse {
    private String reply;
    private String conversationId;
    private List<ProductInfo> relatedProducts;
    private List<OrderInfo> relatedOrders;
    
    @Data
    public static class ProductInfo {
        private Long id;
        private String name;
        private String description;
        private Long price;
        private Integer quantity;
        private String categoryName;
        private String image;
    }
    
    @Data
    public static class OrderInfo {
        private Long orderId;
        private String orderStatus;
        private Long totalPrice;
        private LocalDateTime dateOrder;
        private String payMethod;
        private List<OrderDetailInfo> orderDetails;
    }
    
    @Data
    public static class OrderDetailInfo {
        private String productName;
        private Integer quantity;
        private Long price;
        private Long subTotal;
    }
}