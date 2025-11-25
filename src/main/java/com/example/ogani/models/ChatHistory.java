package com.example.ogani.models;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Entity
@Table(name = "chat_history")
public class ChatHistory {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;
    
    @Column(name = "message", columnDefinition = "TEXT")
    private String message;
    
    @Column(name = "response", columnDefinition = "TEXT")
    private String response;
    
    @Column(name = "is_user_message")
    private Boolean isUserMessage; // true = user, false = bot
    
    @Column(name = "session_id")
    private String sessionId; // Để nhóm các cuộc hội thoại
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @Column(name = "message_type")
    @Enumerated(EnumType.STRING)
    private MessageType messageType;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
    
    public enum MessageType {
        TEXT,           // Tin nhắn văn bản thường
        PRODUCT_QUERY,  // Hỏi về sản phẩm
        ORDER_QUERY,    // Hỏi về đơn hàng
        SUPPORT,        // Hỗ trợ
        OFF_TOPIC       // Câu hỏi ngoài phạm vi
    }
}
