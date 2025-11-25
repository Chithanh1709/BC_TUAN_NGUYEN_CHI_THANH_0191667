package com.example.ogani.config;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

@Configuration
public class GeminiConfig {
    @Value("${gemini.api.key:AIzaSyC-xB8moNVKb1x8I6B9VimZc5J5OW_sEbs}")
    private String apiKey;
    
    @Value("${gemini.api.url:https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent}")
    private String apiUrl;
    
    public String getApiKey() {
        return apiKey;
    }
    
    public String getApiUrl() {
        return apiUrl;
    }

}
