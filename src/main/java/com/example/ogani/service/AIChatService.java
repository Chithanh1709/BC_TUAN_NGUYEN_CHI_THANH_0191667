package com.example.ogani.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import com.example.ogani.dtos.request.ChatAiRequest;
import com.example.ogani.dtos.response.ChatAiResponse;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.HashMap;
import java.util.Map;

@Service
public class AIChatService {

    @Autowired
    private RestTemplate restTemplate;
    
    private final String fastApiUrl = "http://localhost:5000/chat"; 
    
    public ChatAiResponse chatWithAI(ChatAiRequest chatRequest) {
        try {
            if (chatRequest.getMessage() == null || chatRequest.getMessage().trim().isEmpty()) {
                return new ChatAiResponse("Vui lòng nhập câu hỏi.");
            }
            
            System.out.println("🔗 Sending to FastAPI: '" + chatRequest.getMessage() + "'");
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            
            // Tạo JSON với message KHÔNG NULL
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("message", chatRequest.getMessage() != null ? chatRequest.getMessage() : "");
            
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);
            
            // Gọi FastAPI
            ResponseEntity<ChatAiResponse> response = restTemplate.postForEntity(
                fastApiUrl, 
                request, 
                ChatAiResponse.class
            );
            
            System.out.println("✅ Received response from FastAPI");
            return response.getBody();
            
        } catch (HttpClientErrorException e) {
            System.err.println("❌ FastAPI client error: " + e.getStatusCode() + " - " + e.getResponseBodyAsString());
            return new ChatAiResponse("Lỗi kết nối đến AI service: " + e.getStatusCode());
        } catch (Exception e) {
            System.err.println("❌ Error connecting to FastAPI: " + e.getMessage());
            return new ChatAiResponse("Xin lỗi, không thể kết nối đến AI service. Vui lòng thử lại sau.");
        }
    }
}