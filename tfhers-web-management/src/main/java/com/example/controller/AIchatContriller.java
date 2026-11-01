package com.example.controller;

import dev.langchain4j.data.message.ChatMessage;
import dev.langchain4j.data.message.SystemMessage;
import dev.langchain4j.data.message.UserMessage;
import dev.langchain4j.model.chat.response.ChatResponse;
import dev.langchain4j.model.openai.OpenAiChatModel;
import jakarta.servlet.http.HttpServletRequest;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/ai")
public class AIchatContriller {
    private static final Logger log = LoggerFactory.getLogger(AIchatContriller.class);
    @Autowired
    private OpenAiChatModel model;
    @Autowired
    private SystemMessage systemMessage;

    private Long requireUserId(HttpServletRequest request) {
        Object attr = request.getAttribute("userId");
        if (!(attr instanceof Long)) {
            return null;
        }
        return (Long) attr;
    }

    @PostMapping("/chat")
    public Map<String, Object> chat(@RequestParam String question, HttpServletRequest request) {
        HashMap<String, Object> response = new HashMap<>();
        Long userId = this.requireUserId(request);
        if (userId == null) {
            response.put("success", false);
            response.put("code", 401);
            response.put("message", "未登录或令牌无效，请先登录");
            response.put("data", null);
            return response;
        }
        try {
            log.info("[ai] userId={} action=chat qLen={}", userId, question != null ? question.length() : 0);
            List<ChatMessage> messages = new ArrayList<>();
            messages.add(this.systemMessage);
            messages.add(UserMessage.from(question));
            ChatResponse chatResponse = this.model.chat(messages);
            String answer = chatResponse.aiMessage().text();
            response.put("success", true);
            response.put("message", "AI回答成功");
            response.put("data", answer);
            response.put("userId", userId);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "AI服务暂时不可用，请稍后再试");
            response.put("data", null);
            e.printStackTrace();
        }
        return response;
    }

    @GetMapping("/status")
    public Map<String, Object> getStatus(HttpServletRequest request) {
        HashMap<String, Object> response = new HashMap<>();
        Long userId = this.requireUserId(request);
        if (userId == null) {
            response.put("success", false);
            response.put("code", 401);
            response.put("message", "未登录或令牌无效，请先登录");
            response.put("data", null);
            return response;
        }
        try {
            log.info("[ai] userId={} action=status", userId);
            this.model.chat(UserMessage.from("你好"));
            response.put("success", true);
            response.put("message", "AI服务正常");
            response.put("data", Map.of(
                    "status", "online",
                    "model", "qwen-plus",
                    "timestamp", System.currentTimeMillis(),
                    "userId", userId));
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "AI服务异常");
            response.put("data", Map.of(
                    "status", "offline",
                    "error", e.getMessage(),
                    "timestamp", System.currentTimeMillis()));
        }
        return response;
    }
}