package com.example.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpMethod;

import java.util.Map;

@RestController
@RequestMapping("/api/articles")
@CrossOrigin(origins = "*")
public class ArticlesController {

    @Autowired
    private RestTemplate restTemplate;

    private static final String MANAGEMENT_API_BASE_URL = "http://localhost:8081/api/articles";

    /**
     * 获取所有文章列表
     */
    @GetMapping("/all")
    public ResponseEntity<Map<String, Object>> getAllArticles(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            String url = MANAGEMENT_API_BASE_URL + "/all";
            
            // 创建请求头
            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                headers.set("Authorization", authHeader);
            }
            
            org.springframework.http.HttpEntity<String> entity = new org.springframework.http.HttpEntity<>(headers);
            
            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                url, 
                HttpMethod.GET, 
                entity, 
                new ParameterizedTypeReference<Map<String, Object>>() {}
            );
            return ResponseEntity.ok(response.getBody());
        } catch (Exception e) {
            // 返回错误响应
            return ResponseEntity.status(500).body(Map.of(
                "code", 500,
                "msg", "获取文章列表失败: " + e.getMessage(),
                "data", null
            ));
        }
    }

    /**
     * 根据ID获取单篇文章
     */
    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getArticleById(@PathVariable Long id) {
        try {
            String url = MANAGEMENT_API_BASE_URL + "/" + id;
            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                url, 
                HttpMethod.GET, 
                null, 
                new ParameterizedTypeReference<Map<String, Object>>() {}
            );
            return ResponseEntity.ok(response.getBody());
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of(
                "code", 500,
                "msg", "获取文章详情失败: " + e.getMessage(),
                "data", null
            ));
        }
    }

    /**
     * 搜索文章
     */
    @GetMapping("/search")
    public ResponseEntity<Map<String, Object>> searchArticles(@RequestParam String keyword) {
        try {
            String url = MANAGEMENT_API_BASE_URL + "/search?keyword=" + keyword;
            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                url, 
                HttpMethod.GET, 
                null, 
                new ParameterizedTypeReference<Map<String, Object>>() {}
            );
            return ResponseEntity.ok(response.getBody());
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of(
                "code", 500,
                "msg", "搜索文章失败: " + e.getMessage(),
                "data", null
            ));
        }
    }
}
