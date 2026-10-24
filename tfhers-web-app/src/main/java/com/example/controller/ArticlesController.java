package com.example.controller;

import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.Map;
import java.util.HashMap;

@RestController
@RequestMapping("/api/articles")
@CrossOrigin(origins = "*")
public class ArticlesController {

    @Autowired
    private RestTemplate restTemplate;

    @Value("${tfhers.management.base-url:http://localhost:8081}")
    private String managementBaseUrl;

    private String managementArticlesBase() {
        String base = managementBaseUrl == null ? "" : managementBaseUrl.trim();
        if (base.endsWith("/")) {
            base = base.substring(0, base.length() - 1);
        }
        return base + "/api/articles";
    }

    /** Map.of 不允许 null 值，统一用 HashMap（含 data: null） */
    private static Map<String, Object> apiJson(int code, String msg) {
        Map<String, Object> m = new HashMap<>();
        m.put("code", code);
        m.put("msg", msg);
        m.put("data", null);
        return m;
    }

    /** 管理端 401 等错误体可能无 JSON，或 msg 为空、只有 message 字段（拦截器） */
    private static void ensureFrontendMsg(Map<String, Object> parsed, int httpStatus) {
        Object msg = parsed.get("msg");
        boolean empty = msg == null || (msg instanceof String && ((String) msg).isBlank());
        if (!empty) {
            return;
        }
        Object message = parsed.get("message");
        if (message != null && !message.toString().isBlank()) {
            parsed.put("msg", message.toString());
            return;
        }
        if (httpStatus == 401) {
            parsed.put("msg", "请先登录或登录已过期，请重新登录后再试");
        } else {
            parsed.put("msg", "请求失败（HTTP " + httpStatus + "）");
        }
    }

    private static String statusExceptionFallbackMsg(HttpStatusCodeException e) {
        String t = e.getStatusText();
        if (t != null && !t.isBlank()) {
            return t;
        }
        int status = e.getStatusCode().value();
        if (status == 401) {
            return "请先登录或登录已过期，请重新登录后再试";
        }
        if (status == 403) {
            return "没有权限";
        }
        return "请求失败（HTTP " + status + "）";
    }


    /**
     * 我的资讯列表（转发管理端，需登录）
     */
    @GetMapping("/mine")
    public ResponseEntity<Map<String, Object>> getMyArticles(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            String url = managementArticlesBase() + "/mine";
            HttpHeaders headers = new HttpHeaders();
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                headers.set("Authorization", authHeader);
            }
            HttpEntity<String> entity = new HttpEntity<>(headers);
            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                    url, HttpMethod.GET, entity,
                    new ParameterizedTypeReference<Map<String, Object>>() {});
            return ResponseEntity.ok(response.getBody());
        } catch (HttpStatusCodeException e) {
            try {
                String raw = e.getResponseBodyAsString();
                if (raw != null && raw.trim().startsWith("{")) {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> parsed = (Map<String, Object>) new ObjectMapper().readValue(raw, Map.class);
                    ensureFrontendMsg(parsed, e.getStatusCode().value());
                    return ResponseEntity.status(e.getStatusCode()).body(parsed);
                }
            } catch (Exception ignored) {}
            return ResponseEntity.status(e.getStatusCode()).body(apiJson(e.getStatusCode().value(), statusExceptionFallbackMsg(e)));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(apiJson(500,
                    "获取我的资讯失败: " + (e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName())));
        }
    }

    /**
     * 删除资讯（本人或管理员；转发管理端）
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> deleteArticle(
            @PathVariable Long id,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            String url = managementArticlesBase() + "/" + id;
            HttpHeaders headers = new HttpHeaders();
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                headers.set("Authorization", authHeader);
            }
            HttpEntity<String> entity = new HttpEntity<>(headers);
            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                    url, HttpMethod.DELETE, entity,
                    new ParameterizedTypeReference<Map<String, Object>>() {});
            return ResponseEntity.ok(response.getBody());
        } catch (HttpStatusCodeException e) {
            try {
                String raw = e.getResponseBodyAsString();
                if (raw != null && raw.trim().startsWith("{")) {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> parsed = (Map<String, Object>) new ObjectMapper().readValue(raw, Map.class);
                    ensureFrontendMsg(parsed, e.getStatusCode().value());
                    return ResponseEntity.status(e.getStatusCode()).body(parsed);
                }
            } catch (Exception ignored) {}
            return ResponseEntity.status(e.getStatusCode()).body(apiJson(e.getStatusCode().value(), statusExceptionFallbackMsg(e)));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(apiJson(500,
                    "删除资讯失败: " + (e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName())));
        }
    }

    /**
     * 获取所有文章列表
     */
    @GetMapping("/all")
    public ResponseEntity<Map<String, Object>> getAllArticles(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            String url = managementArticlesBase() + "/all";
            
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
            return ResponseEntity.status(500).body(apiJson(500,
                "获取文章列表失败: " + (e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName())));
        }
    }

    /**
     * 根据ID获取单篇文章（转发 Authorization 以返回 likeCount、liked）
     */
    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getArticleById(
            @PathVariable Long id,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            String url = managementArticlesBase() + "/" + id;
            HttpHeaders headers = new HttpHeaders();
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                headers.set("Authorization", authHeader);
            }
            HttpEntity<String> entity = new HttpEntity<>(headers);
            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                url, HttpMethod.GET, entity,
                new ParameterizedTypeReference<Map<String, Object>>() {}
            );
            return ResponseEntity.ok(response.getBody());
        } catch (Exception e) {
            return ResponseEntity.status(500).body(apiJson(500,
                "获取文章详情失败: " + (e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName())));
        }
    }

    /**
     * 点赞/取消点赞
     */
    @PostMapping("/{id}/like")
    public ResponseEntity<Map<String, Object>> toggleLike(
            @PathVariable Long id,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            String url = managementArticlesBase() + "/" + id + "/like";
            HttpHeaders headers = new HttpHeaders();
            headers.set("Content-Type", "application/json");
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                headers.set("Authorization", authHeader);
            }
            HttpEntity<String> entity = new HttpEntity<>(headers);
            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                url, HttpMethod.POST, entity,
                new ParameterizedTypeReference<Map<String, Object>>() {}
            );
            return ResponseEntity.ok(response.getBody());
        } catch (Exception e) {
            return ResponseEntity.status(e.getMessage() != null && e.getMessage().contains("401") ? 401 : 500)
                .body(apiJson(401, "请先登录"));
        }
    }

    /**
     * 获取文章评论列表（树形）
     */
    @GetMapping("/{id}/comments")
    public ResponseEntity<Map<String, Object>> getComments(@PathVariable Long id) {
        try {
            String url = managementArticlesBase() + "/" + id + "/comments";
            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                url, HttpMethod.GET, null,
                new ParameterizedTypeReference<Map<String, Object>>() {}
            );
            return ResponseEntity.ok(response.getBody());
        } catch (Exception e) {
            return ResponseEntity.status(500).body(apiJson(500,
                "获取评论失败: " + (e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName())));
        }
    }

    /**
     * 发表评论
     */
    @PostMapping("/{id}/comments")
    public ResponseEntity<Map<String, Object>> addComment(
            @PathVariable Long id,
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestBody Map<String, Object> body) {
        try {
            String url = managementArticlesBase() + "/" + id + "/comments";
            HttpHeaders headers = new HttpHeaders();
            headers.set("Content-Type", "application/json");
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                headers.set("Authorization", authHeader);
            }
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                url, HttpMethod.POST, entity,
                new ParameterizedTypeReference<Map<String, Object>>() {}
            );
            return ResponseEntity.ok(response.getBody());
        } catch (HttpStatusCodeException e) {
            // 转发管理端的状态码 + body（例如 400：敏感词/审核拒绝）
            try {
                String raw = e.getResponseBodyAsString();
                if (raw != null && raw.trim().startsWith("{")) {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> parsed = (Map<String, Object>) new ObjectMapper().readValue(raw, Map.class);
                    ensureFrontendMsg(parsed, e.getStatusCode().value());
                    return ResponseEntity.status(e.getStatusCode()).body(parsed);
                }
            } catch (Exception ignored) {}
            return ResponseEntity.status(e.getStatusCode()).body(apiJson(e.getStatusCode().value(), statusExceptionFallbackMsg(e)));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(apiJson(500,
                "评论失败: " + (e.getMessage() != null ? e.getMessage() : "服务器错误")));
        }
    }

    /**
     * 举报文章（必须登录，转发到管理端）
     */
    @PostMapping("/{id}/report")
    public ResponseEntity<Map<String, Object>> reportArticle(
            @PathVariable Long id,
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestBody(required = false) Map<String, Object> body) {
        try {
            if (body == null) {
                body = new HashMap<>();
            }
            String url = managementArticlesBase() + "/" + id + "/report";
            HttpHeaders headers = new HttpHeaders();
            headers.set("Content-Type", "application/json");
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                headers.set("Authorization", authHeader);
            }
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                url, HttpMethod.POST, entity,
                new ParameterizedTypeReference<Map<String, Object>>() {}
            );
            return ResponseEntity.ok(response.getBody());
        } catch (HttpStatusCodeException e) {
            // 将管理端的状态码和 body 转发；401 时响应体常为空，getStatusText() 也可能是空串
            try {
                String raw = e.getResponseBodyAsString();
                if (raw != null && raw.trim().startsWith("{")) {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> parsed = (Map<String, Object>) new ObjectMapper().readValue(raw, Map.class);
                    ensureFrontendMsg(parsed, e.getStatusCode().value());
                    return ResponseEntity.status(e.getStatusCode()).body(parsed);
                }
            } catch (Exception ignored) {}
            Map<String, Object> fallback = new HashMap<>();
            fallback.put("code", e.getStatusCode().value());
            fallback.put("msg", statusExceptionFallbackMsg(e));
            fallback.put("data", null);
            return ResponseEntity.status(e.getStatusCode()).body(fallback);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(apiJson(500,
                "举报失败: " + (e.getMessage() != null ? e.getMessage() : e.getClass().getName())));
        }
    }

    /**
     * 举报评论（转发到管理端）
     */
    @PostMapping("/comments/{commentId}/report")
    public ResponseEntity<Map<String, Object>> reportComment(
            @PathVariable Long commentId,
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestBody(required = false) Map<String, Object> body) {
        try {
            if (body == null) {
                body = new HashMap<>();
            }
            String url = managementArticlesBase() + "/comments/" + commentId + "/report";
            HttpHeaders headers = new HttpHeaders();
            headers.set("Content-Type", "application/json");
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                headers.set("Authorization", authHeader);
            }
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                    url, HttpMethod.POST, entity,
                    new ParameterizedTypeReference<Map<String, Object>>() {}
            );
            return ResponseEntity.ok(response.getBody());
        } catch (HttpStatusCodeException e) {
            try {
                String raw = e.getResponseBodyAsString();
                if (raw != null && raw.trim().startsWith("{")) {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> parsed = (Map<String, Object>) new ObjectMapper().readValue(raw, Map.class);
                    ensureFrontendMsg(parsed, e.getStatusCode().value());
                    return ResponseEntity.status(e.getStatusCode()).body(parsed);
                }
            } catch (Exception ignored) {}
            Map<String, Object> fallback = new HashMap<>();
            fallback.put("code", e.getStatusCode().value());
            fallback.put("msg", statusExceptionFallbackMsg(e));
            fallback.put("data", null);
            return ResponseEntity.status(e.getStatusCode()).body(fallback);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(apiJson(500,
                    "举报失败: " + (e.getMessage() != null ? e.getMessage() : e.getClass().getName())));
        }
    }

    /**
     * 搜索文章
     */
    @GetMapping("/search")
    public ResponseEntity<Map<String, Object>> searchArticles(@RequestParam String keyword) {
        try {
            String url = managementArticlesBase() + "/search?keyword=" + keyword;
            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                url, 
                HttpMethod.GET, 
                null, 
                new ParameterizedTypeReference<Map<String, Object>>() {}
            );
            return ResponseEntity.ok(response.getBody());
        } catch (Exception e) {
            return ResponseEntity.status(500).body(apiJson(500,
                "搜索文章失败: " + (e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName())));
        }
    }
}
