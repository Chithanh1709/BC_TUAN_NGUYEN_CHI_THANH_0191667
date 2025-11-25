package com.example.ogani.controller;

import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody; // SỬA IMPORT NÀY
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.ogani.dtos.request.ChatAiRequest;
import com.example.ogani.dtos.response.ChatAiResponse;
import com.example.ogani.service.AIChatService;

@RestController
@RequestMapping("/api/chat")
@CrossOrigin(origins = "http://localhost:4200")
public class ChatController {

    @Autowired
    private AIChatService aiChatService;

    @PostMapping
    public ChatAiResponse chat(@RequestBody ChatAiRequest chatRequest) { // BÂY GIỜ SẼ HOẠT ĐỘNG
        try {
            System.out.println("🎯 Received ChatAiRequest object: " + chatRequest);
            System.out.println("📝 Message value: '" + chatRequest.getMessage() + "'");

            // Validate
            if (chatRequest.getMessage() == null) {
                System.out.println("❌ Message is NULL");
                return new ChatAiResponse("Lỗi: message là null");
            }

            String message = chatRequest.getMessage().trim();
            if (message.isEmpty()) {
                System.out.println("❌ Message is empty");
                return new ChatAiResponse("Vui lòng nhập câu hỏi.");
            }

            System.out.println("✅ Processing message: '" + message + "'");
            return aiChatService.chatWithAI(chatRequest);

        } catch (Exception e) {
            System.err.println("💥 Controller error: " + e.getMessage());
            e.printStackTrace();
            return new ChatAiResponse("Lỗi xử lý request: " + e.getMessage());
        }
    }
}