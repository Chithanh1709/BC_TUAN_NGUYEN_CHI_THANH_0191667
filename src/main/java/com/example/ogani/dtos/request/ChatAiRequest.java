package com.example.ogani.dtos.request;
import lombok.Data;

@Data
public class ChatAiRequest {
    private String message;
    private Long userId;
    private String conversationId;
}
