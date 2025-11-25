package com.example.ogani.dtos.request;

public class ChatAiRequest {
    private String message;
    private String userId; // Optional
    
    // Constructors
    public ChatAiRequest() {}
    
    public  ChatAiRequest(String message) {
        this.message = message;
    }
    
    // Getters and Setters
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
}
