package com.example.ogani.controller;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.example.ogani.dtos.request.ChatAiRequest;
import com.example.ogani.dtos.response.ChatAiResponse;
import com.example.ogani.dtos.response.ChatHistoryDTO;
import com.example.ogani.service.GeminiChatService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/api/chatbot")
@CrossOrigin(origins = "*", maxAge = 3600)
@Tag(name = "Chatbot AI", description = "API chatbot với context awareness")
@Slf4j
public class ChatController {
    
    @Autowired
    private GeminiChatService aiChatService;

    @PostMapping("/chat")
    @Operation(summary = "Gửi tin nhắn đến chatbot AI")
    public ResponseEntity<?> chat(@RequestBody ChatAiRequest request) {
        try {
            if (request.getMessage() == null || request.getMessage().trim().isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Tin nhắn không được để trống"));
            }

            log.info("Received message from userId={}: {}", request.getUserId(), request.getMessage());

            ChatAiResponse response = aiChatService.chat(
                request.getMessage(), 
                request.getUserId(),
                request.getConversationId()
            );
            
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Error in chatbot: ", e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Đã xảy ra lỗi: " + e.getMessage()));
        }
    }
    
    @GetMapping("/history/{userId}")
    @Operation(summary = "Lấy lịch sử chat của user")
    public ResponseEntity<?> getChatHistory(@PathVariable Long userId) {
        try {
            List<ChatHistoryDTO> history = aiChatService.getChatHistory(userId);
            return ResponseEntity.ok(history);
        } catch (Exception e) {
            log.error("Error getting chat history: ", e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Đã xảy ra lỗi: " + e.getMessage()));
        }
    }
    
    @DeleteMapping("/history/{userId}")
    @Operation(summary = "Xóa lịch sử chat của user")
    public ResponseEntity<?> clearChatHistory(@PathVariable Long userId) {
        try {
            aiChatService.clearChatHistory(userId);
            return ResponseEntity.ok(Map.of("message", "Đã xóa lịch sử chat thành công"));
        } catch (Exception e) {
            log.error("Error clearing chat history: ", e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Đã xảy ra lỗi: " + e.getMessage()));
        }
    }
}