package com.example.controller;

import dev.langchain4j.data.message.ChatMessage;
import dev.langchain4j.data.message.SystemMessage;
import dev.langchain4j.model.openai.OpenAiChatModel;
import dev.langchain4j.data.message.UserMessage;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/ai")
@CrossOrigin(origins = "*")
public class AIchatContriller {
    
    @Autowired
    private OpenAiChatModel model;
    
    @Autowired
    private SystemMessage systemMessage;

    /**
     * AI聊天接口
     * @param question 用户问题
     * @return AI回答
     */
    @PostMapping("/chat")
    public Map<String, Object> chat(@RequestParam String question) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            // 创建包含系统消息的对话
            List<ChatMessage> messages = new ArrayList<>();
            messages.add(systemMessage);  // 添加系统消息
            messages.add(UserMessage.from(question));  // 添加用户消息
            
            // 调用AI模型并正确提取文本
            var chatResponse = model.chat(messages);
            String answer = chatResponse.aiMessage().text();

            response.put("success", true);
            response.put("message", "AI回答成功");
            response.put("data", answer);


        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "AI服务暂时不可用，请稍后再试");
            response.put("data", null);
            e.printStackTrace();
        }
        
        return response;
    }
    
    
    /**
     * 获取AI状态
     * @return AI服务状态
     */
    @GetMapping("/status")
    public Map<String, Object> getStatus() {
        Map<String, Object> response = new HashMap<>();
        
        try {
            // 简单的健康检查
            model.chat(UserMessage.from("你好"));
            
            response.put("success", true);
            response.put("message", "AI服务正常");
            response.put("data", Map.of(
                "status", "online",
                "model", "qwen-plus",
                "timestamp", System.currentTimeMillis()
            ));
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "AI服务异常");
            response.put("data", Map.of(
                "status", "offline",
                "error", e.getMessage(),
                "timestamp", System.currentTimeMillis()
            ));
        }
        
        return response;
    }
}