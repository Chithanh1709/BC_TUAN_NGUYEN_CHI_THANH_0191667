package com.example.ogani.dtos.response;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class ChatHistoryDTO {
    private Long id;
    private String message;
    private String response;
    private Boolean isUserMessage;
    private LocalDateTime createdAt;
    private String messageType;
}
