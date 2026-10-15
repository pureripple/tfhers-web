package com.example.controller;

import com.example.pojo.AdminUser;
import com.example.pojo.ArticleComment;
import com.example.pojo.User;
import com.example.pojo.articles;
import com.example.pojo.results;
import com.example.mapper.AdminUserMapper;
import com.example.mapper.UserMapper;
import com.example.service.ArticleCommentService;
import com.example.service.ArticleLikeService;
import com.example.service.ContentReportService;
import com.example.service.articlesService;
import com.example.util.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import java.util.Map;
import java.util.HashMap;

@RestController
@RequestMapping("/api/articles")
@CrossOrigin(origins = "*")
public class articlesController {

    @Autowired
    private articlesService articlesService;
    @Autowired
    private ArticleLikeService articleLikeService;
    @Autowired
    private ArticleCommentService articleCommentService;
    @Autowired
    private ContentReportService contentReportService;
    @Autowired
    private JwtUtil jwtUtil;
    @Autowired
    private UserMapper userMapper;
    @Autowired
    private AdminUserMapper adminUserMapper;

    /** Map.of 不允许 null 值，统一用 HashMap 返回 JSON（含 data: null） */
    private static Map<String, Object> apiJson(int code, String msg) {
        Map<String, Object> m = new HashMap<>();
        m.put("code", code);
        m.put("msg", msg);
        m.put("data", null);
        return m;
    }

    /**
     * 获取所有文章列表
     * @return 文章列表
     */
    @GetMapping(value = "/all", produces = "application/json")
    public ResponseEntity<Map<String, Object>> getAllArticles() {
        results result = articlesService.getAllArticles();
        Map<String, Object> response = new HashMap<>();
        response.put("code", result.getCode());
        response.put("msg", result.getMsg());
        response.put("data", result.getData());
        return ResponseEntity.ok(response);
    }
    
    /**
     * 根据id删除文章
     * @param id 文章id
     * @return 删除结果
     */
    @DeleteMapping(value = "/{id}", produces = "application/json")
    public ResponseEntity<Map<String, Object>> deleteArticleById(@PathVariable long id) {
        results result = articlesService.deleteArticleById(id);
        Map<String, Object> response = new HashMap<>();
        response.put("code", result.getCode());
        response.put("msg", result.getMsg());
        response.put("data", result.getData());
        
        // 根据操作结果返回不同的HTTP状态码
        if (result.getCode() == 200) {
            return ResponseEntity.ok(response);
        } else {
            return ResponseEntity.badRequest().body(response);
        }
    }
    
    /**
     * 新增文章
     * @param article 文章对象
     * @return 新增结果
     */
    @PostMapping(value = "", produces = "application/json", consumes = "application/json")
    public ResponseEntity<Map<String, Object>> addArticle(
            @RequestBody articles article,
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            HttpServletRequest request) {
        // 发布资讯须先通过 LoginInterceptor（有效 Token），此处优先用拦截器已解析的 userId，避免仅 validateToken 失败导致 author_id 未写入
        Long uidAttr = (Long) request.getAttribute("userId");
        String usernameAttr = (String) request.getAttribute("username");
        if (uidAttr != null) {
            applyAuthorIdsForUser(article, uidAttr, usernameAttr);
        } else if (authHeader != null && authHeader.startsWith("Bearer ")) {
            try {
                String token = authHeader.substring(7);
                if (jwtUtil.validateToken(token)) {
                    applyAuthorIdsFromJwt(article, token);
                }
            } catch (Exception ignored) {
            }
        }
        results result = articlesService.addArticle(article);
        Map<String, Object> response = new HashMap<>();
        response.put("code", result.getCode());
        response.put("msg", result.getMsg());
        response.put("data", result.getData());
        
        // 根据操作结果返回不同的HTTP状态码
        if (result.getCode() == 200) {
            return ResponseEntity.ok(response);
        } else {
            return ResponseEntity.badRequest().body(response);
        }
    }
    
    /**
     * 根据ID查询单篇文章（含 likeCount、liked；可选 Authorization 以返回当前用户是否已点赞）
     */
    @GetMapping(value = "/{id}", produces = "application/json")
    public ResponseEntity<Map<String, Object>> getArticleById(
            @PathVariable long id,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        Long userId = null;
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            try {
                if (jwtUtil.validateToken(authHeader.substring(7))) {
                    userId = jwtUtil.getUserIdFromToken(authHeader.substring(7));
                }
            } catch (Exception ignored) {}
        }
        results result = articlesService.getArticleById(id, userId);
        Map<String, Object> response = new HashMap<>();
        response.put("code", result.getCode());
        response.put("msg", result.getMsg());
        response.put("data", result.getData());
        if (result.getCode() == 200) {
            return ResponseEntity.ok(response);
        } else {
            return ResponseEntity.badRequest().body(response);
        }
    }

    /**
     * 点赞/取消点赞（二次点击取消）
     */
    @PostMapping(value = "/{id}/like", produces = "application/json")
    public ResponseEntity<Map<String, Object>> toggleLike(
            @PathVariable long id,
            @RequestHeader("Authorization") String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(401).body(apiJson(401, "请先登录"));
        }
        try {
            String token = authHeader.substring(7);
            if (!jwtUtil.validateToken(token)) {
                return ResponseEntity.status(401).body(apiJson(401, "登录已过期"));
            }
            Long userId = jwtUtil.getUserIdFromToken(token);
            results result = articleLikeService.toggleLike(id, userId);
            Map<String, Object> response = new HashMap<>();
            response.put("code", result.getCode());
            response.put("msg", result.getMsg());
            response.put("data", result.getData());
            return result.getCode() == 200 ? ResponseEntity.ok(response) : ResponseEntity.badRequest().body(response);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(apiJson(500, "操作失败"));
        }
    }

    /**
     * 获取文章评论列表（树形，多级回复）
     */
    @GetMapping(value = "/{id}/comments", produces = "application/json")
    public ResponseEntity<Map<String, Object>> getComments(@PathVariable long id) {
        List<ArticleComment> comments = articleCommentService.getCommentTree(id);
        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("msg", "成功");
        response.put("data", comments);
        return ResponseEntity.ok(response);
    }

    /**
     * 发表评论（一级评论 parentId 不传或 null，回复评论传 parentId）
     */
    @PostMapping(value = "/{id}/comments", produces = "application/json", consumes = "application/json")
    public ResponseEntity<Map<String, Object>> addComment(
            @PathVariable long id,
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestBody Map<String, Object> body) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(401).body(apiJson(401, "请先登录"));
        }
        try {
            String token = authHeader.substring(7);
            if (!jwtUtil.validateToken(token)) {
                return ResponseEntity.status(401).body(apiJson(401, "登录已过期"));
            }
            Long userId = jwtUtil.getUserIdFromToken(token);
            String content = (String) body.get("content");
            Long parentId = body.get("parentId") != null ? Long.valueOf(body.get("parentId").toString()) : null;
            results result = articleCommentService.addComment(id, userId, content, parentId);
            Map<String, Object> response = new HashMap<>();
            response.put("code", result.getCode());
            response.put("msg", result.getMsg());
            response.put("data", result.getData());
            return result.getCode() == 200 ? ResponseEntity.ok(response) : ResponseEntity.badRequest().body(response);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(apiJson(500, "评论失败"));
        }
    }

    /**
     * 举报文章（必须登录）
     * body: { "reason": "spam|abuse|porn|illegal|copyright|other", "content": "...(可选)", "evidenceUrl": "...(可选)" }
     */
    @PostMapping(value = "/{id}/report", produces = "application/json", consumes = "application/json")
    public ResponseEntity<Map<String, Object>> reportArticle(
            @PathVariable long id,
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestBody(required = false) Map<String, Object> body) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(401).body(apiJson(401, "请先登录"));
        }
        if (body == null) {
            body = new HashMap<>();
        }
        try {
            String token = authHeader.substring(7);
            if (!jwtUtil.validateToken(token)) {
                return ResponseEntity.status(401).body(apiJson(401, "登录已过期"));
            }
            Long userId = jwtUtil.getUserIdFromToken(token);
            if (userId == null) {
                return ResponseEntity.status(401).body(apiJson(401, "无法解析用户信息，请重新登录"));
            }
            String reason = body.get("reason") != null ? body.get("reason").toString() : null;
            String content = body.get("content") != null ? body.get("content").toString() : null;
            String evidenceUrl = body.get("evidenceUrl") != null ? body.get("evidenceUrl").toString() : null;

            results result = contentReportService.reportArticle(id, userId, reason, content, evidenceUrl);
            Map<String, Object> response = new HashMap<>();
            response.put("code", result.getCode());
            response.put("msg", result.getMsg());
            response.put("data", result.getData());
            return result.getCode() == 200 ? ResponseEntity.ok(response) : ResponseEntity.badRequest().body(response);
        } catch (Exception e) {
            e.printStackTrace();
            String detail = e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName();
            Map<String, Object> err = new HashMap<>();
            err.put("code", 500);
            err.put("msg", "举报失败：" + detail);
            err.put("data", null);
            return ResponseEntity.status(500).body(err);
        }
    }

    /**
     * 举报评论（必须登录）
     * body: { "reason": "...", "content": "...(可选)", "evidenceUrl": "...(可选)" }
     */
    @PostMapping(value = "/comments/{commentId}/report", produces = "application/json", consumes = "application/json")
    public ResponseEntity<Map<String, Object>> reportComment(
            @PathVariable long commentId,
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestBody(required = false) Map<String, Object> body) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(401).body(apiJson(401, "请先登录"));
        }
        if (body == null) {
            body = new HashMap<>();
        }
        try {
            String token = authHeader.substring(7);
            if (!jwtUtil.validateToken(token)) {
                return ResponseEntity.status(401).body(apiJson(401, "登录已过期"));
            }
            Long userId = jwtUtil.getUserIdFromToken(token);
            if (userId == null) {
                return ResponseEntity.status(401).body(apiJson(401, "无法解析用户信息，请重新登录"));
            }
            String reason = body.get("reason") != null ? body.get("reason").toString() : null;
            String content = body.get("content") != null ? body.get("content").toString() : null;
            String evidenceUrl = body.get("evidenceUrl") != null ? body.get("evidenceUrl").toString() : null;

            results result = contentReportService.reportComment(commentId, userId, reason, content, evidenceUrl);
            Map<String, Object> response = new HashMap<>();
            response.put("code", result.getCode());
            response.put("msg", result.getMsg());
            response.put("data", result.getData());
            return result.getCode() == 200 ? ResponseEntity.ok(response) : ResponseEntity.badRequest().body(response);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(apiJson(500, "举报失败"));
        }
    }
    
    /**
     * 更新文章
     * @param article 文章对象
     * @return 更新结果
     */
    /**
     * 置顶开关（需登录，管理端列表使用）
     */
    @PatchMapping(value = "/{id}/pinned", produces = "application/json", consumes = "application/json")
    public ResponseEntity<Map<String, Object>> updateArticlePinned(
            @PathVariable long id,
            @RequestBody Map<String, Object> body) {
        boolean pinned = false;
        if (body != null) {
            Object p = body.get("pinned");
            if (Boolean.TRUE.equals(p)) {
                pinned = true;
            } else if (p instanceof Number && ((Number) p).intValue() != 0) {
                pinned = true;
            }
        }
        results result = articlesService.updateArticlePinned(id, pinned);
        Map<String, Object> response = new HashMap<>();
        response.put("code", result.getCode());
        response.put("msg", result.getMsg());
        response.put("data", result.getData());
        return result.getCode() == 200 ? ResponseEntity.ok(response) : ResponseEntity.badRequest().body(response);
    }

    @PutMapping(value = "", produces = "application/json", consumes = "application/json")
    public ResponseEntity<Map<String, Object>> updateArticle(@RequestBody articles article) {
        results result = articlesService.updateArticle(article);
        Map<String, Object> response = new HashMap<>();
        response.put("code", result.getCode());
        response.put("msg", result.getMsg());
        response.put("data", result.getData());
        
        // 根据操作结果返回不同的HTTP状态码
        if (result.getCode() == 200) {
            return ResponseEntity.ok(response);
        } else {
            return ResponseEntity.badRequest().body(response);
        }
    }
    
    /**
     * 搜索文章
     * @param keyword 搜索关键词
     * @return 搜索结果
     */
    @GetMapping(value = "/search", produces = "application/json")
    public ResponseEntity<Map<String, Object>> searchArticles(@RequestParam String keyword) {
        results result = articlesService.searchArticles(keyword);
        Map<String, Object> response = new HashMap<>();
        response.put("code", result.getCode());
        response.put("msg", result.getMsg());
        response.put("data", result.getData());
        
        // 根据操作结果返回不同的HTTP状态码
        if (result.getCode() == 200) {
            return ResponseEntity.ok(response);
        } else {
            return ResponseEntity.badRequest().body(response);
        }
    }

    private void applyAuthorIdsFromJwt(articles article, String token) {
        Long uid = jwtUtil.getUserIdFromToken(token);
        if (uid == null) {
            return;
        }
        applyAuthorIdsForUser(article, uid, jwtUtil.getUsernameFromToken(token));
    }

    /**
     * 写入 author_id（users）或 author_admin_id（admin_users）。
     * 仅一侧表存在该 userId 时直接关联；两侧同号时再用用户名区分；仍无法区分时默认归为前台用户。
     */
    private void applyAuthorIdsForUser(articles article, Long uid, String usernameRaw) {
        if (uid == null) {
            return;
        }
        String un = (usernameRaw != null && !usernameRaw.isBlank()) ? usernameRaw.trim() : "";

        User u = userMapper.findById(uid);
        AdminUser au = adminUserMapper.findById(uid);

        if (u != null && au == null) {
            article.setAuthorId(uid);
            article.setAuthorAdminId(null);
            return;
        }
        if (au != null && u == null) {
            article.setAuthorAdminId(uid);
            article.setAuthorId(null);
            return;
        }
        if (u != null && au != null) {
            if (!un.isEmpty()) {
                if (u.getUsername() != null && un.equalsIgnoreCase(u.getUsername().trim())) {
                    article.setAuthorId(uid);
                    article.setAuthorAdminId(null);
                    return;
                }
                if (au.getUsername() != null && un.equalsIgnoreCase(au.getUsername().trim())) {
                    article.setAuthorAdminId(uid);
                    article.setAuthorId(null);
                    return;
                }
                User u2 = userMapper.findByUsername(un);
                if (u2 != null && uid.equals(u2.getId())) {
                    article.setAuthorId(uid);
                    article.setAuthorAdminId(null);
                    return;
                }
                AdminUser au2 = adminUserMapper.findByUsername(un);
                if (au2 != null && uid.equals(au2.getId())) {
                    article.setAuthorAdminId(uid);
                    article.setAuthorId(null);
                    return;
                }
            } else {
                article.setAuthorId(uid);
                article.setAuthorAdminId(null);
            }
            return;
        }
        if (!un.isEmpty()) {
            User u2 = userMapper.findByUsername(un);
            if (u2 != null && uid.equals(u2.getId())) {
                article.setAuthorId(uid);
                article.setAuthorAdminId(null);
                return;
            }
            AdminUser au2 = adminUserMapper.findByUsername(un);
            if (au2 != null && uid.equals(au2.getId())) {
                article.setAuthorAdminId(uid);
                article.setAuthorId(null);
            }
        }
    }
}
