package com.example.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.HashMap;
import java.util.Map;

/**
 * 将用户端 /api/ai/* 转发到管理端（实际调用大模型与 langchain4j 配置在 management 工程）。
 */
@RestController
@RequestMapping("/api/ai")
@CrossOrigin(origins = "*")
public class AiChatProxyController {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    @Value("${tfhers.management.base-url:http://localhost:8081}")
    private String managementBaseUrl;

    @Autowired
    private RestTemplate restTemplate;

    private String managementAiBase() {
        String base = managementBaseUrl == null ? "" : managementBaseUrl.trim();
        if (base.endsWith("/")) {
            base = base.substring(0, base.length() - 1);
        }
        return base + "/api/ai";
    }

    @PostMapping("/chat")
    public ResponseEntity<Map<String, Object>> chat(@RequestParam(value = "question", required = false) String question) {
        if (question == null || question.isBlank()) {
            Map<String, Object> err = new HashMap<>();
            err.put("success", false);
            err.put("message", "问题不能为空");
            err.put("data", null);
            return ResponseEntity.badRequest().body(err);
        }
        String url = managementAiBase() + "/chat";
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("question", question);
        HttpEntity<MultiValueMap<String, String>> entity = new HttpEntity<>(body, headers);
        try {
            ResponseEntity<Map<String, Object>> resp = restTemplate.exchange(
                    url,
                    HttpMethod.POST,
                    entity,
                    new ParameterizedTypeReference<Map<String, Object>>() {}
            );
            return ResponseEntity.status(resp.getStatusCode()).body(resp.getBody());
        } catch (HttpStatusCodeException e) {
            return copyErrorBody(e);
        } catch (RestClientException e) {
            return managementUnavailable(e);
        }
    }

    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> status() {
        String url = managementAiBase() + "/status";
        try {
            ResponseEntity<Map<String, Object>> resp = restTemplate.exchange(
                    url,
                    HttpMethod.GET,
                    null,
                    new ParameterizedTypeReference<Map<String, Object>>() {}
            );
            return ResponseEntity.status(resp.getStatusCode()).body(resp.getBody());
        } catch (HttpStatusCodeException e) {
            return copyErrorBody(e);
        } catch (RestClientException e) {
            return managementUnavailable(e);
        }
    }

    private static ResponseEntity<Map<String, Object>> copyErrorBody(HttpStatusCodeException e) {
        try {
            String raw = e.getResponseBodyAsString();
            if (raw != null && raw.trim().startsWith("{")) {
                @SuppressWarnings("unchecked")
                Map<String, Object> map = OBJECT_MAPPER.readValue(raw, Map.class);
                return ResponseEntity.status(e.getStatusCode()).body(map);
            }
        } catch (Exception ignored) {
        }
        Map<String, Object> fallback = new HashMap<>();
        fallback.put("success", false);
        fallback.put("message", e.getMessage() != null ? e.getMessage() : "上游服务错误");
        fallback.put("data", null);
        return ResponseEntity.status(e.getStatusCode()).body(fallback);
    }

    private static ResponseEntity<Map<String, Object>> managementUnavailable(RestClientException e) {
        Map<String, Object> body = new HashMap<>();
        body.put("success", false);
        body.put("message", "无法连接管理端 AI 服务，请确认 tfhers-web-management 已启动且 tfhers.management.base-url 配置正确");
        body.put("data", null);
        return ResponseEntity.status(503).body(body);
    }
}
