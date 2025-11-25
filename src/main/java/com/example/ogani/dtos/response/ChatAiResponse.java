package com.example.ogani.dtos.response;

public class ChatAiResponse {
    private String answer;

    public ChatAiResponse() {}

    public ChatAiResponse(String answer) {
        this.answer = answer;
    }

    public String getAnswer() {
        return answer;
    }

    public void setAnswer(String answer) {
        this.answer = answer;
    }
}
