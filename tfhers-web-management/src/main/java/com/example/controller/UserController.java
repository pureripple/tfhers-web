package com.example.controller;

import com.example.pojo.User;
import com.example.pojo.SteamPlaytimeHistory;
import com.example.pojo.results;
import com.example.mapper.SteamPlaytimeHistoryMapper;
import com.example.mapper.GameAchievementSchemaMapper;
import com.example.pojo.GameAchievementSchema;
import com.example.service.UserService;
import com.example.util.JwtUtil;
import com.example.util.OssUtil;
import com.example.util.SteamBindRedirect;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.InputStream;
import java.net.URL;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.HashSet;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/api/user")
@CrossOrigin(origins = "*")
public class UserController {
    private static final ObjectMapper JSON = new ObjectMapper();

    @Autowired
    private UserService userService;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private SteamPlaytimeHistoryMapper steamPlaytimeHistoryMapper;

    @Autowired
    private OssUtil ossUtil;

    @Autowired
    private GameAchievementSchemaMapper gameAchievementSchemaMapper;

    @Value("${steam.api-key}")
    private String steamApiKey;

    @Value("${steam.app-id}")
    private Long steamAppId;

    @Value("${steam.return-url}")
    private String steamReturnUrl;

    @Value("${steam.realm}")
    private String steamRealm;

    /** 前端站点根，对应 FRONTEND_BASE_URL / tfhers.frontend.base-url */
    @Value("${tfhers.frontend.base-url:http://localhost:5173}")
    private String frontendBaseUrl;

    @Value("${steam.playtime.cache-ttl-minutes:60}")
    private long playtimeCacheTtlMinutes;

    // Steam 成就 schema 缓存（减少 GetSchemaForGame 频率）
    private static final Duration ACHV_SCHEMA_TTL = Duration.ofHours(24);
    private static volatile Instant achvSchemaLoadedAt = null;
    // key: apiname
    private static final ConcurrentHashMap<String, Map<String, Object>> achvSchemaCache = new ConcurrentHashMap<>();

    /** Map.of 不允许 null 值，统一用 HashMap 返回（含 data: null） */
    private static Map<String, Object> apiJson(int code, String msg) {
        Map<String, Object> m = new HashMap<>();
        m.put("code", code);
        m.put("msg", msg);
        m.put("data", null);
        return m;
    }

    /**
     * 用户注册
     */
    @PostMapping(value = "/register", consumes = "multipart/form-data")
    public ResponseEntity<Map<String, Object>> register(
            @RequestParam("username") String username,
            @RequestParam("nickname") String nickname,
            @RequestParam("password") String password,
            @RequestParam(value = "email", required = false) String email,
            @RequestParam(value = "phone", required = false) String phone,
            @RequestParam(value = "avatar", required = false) MultipartFile avatar) {
        
        try {
            // 创建用户对象
            User user = new User();
            user.setUsername(username);
            user.setNickname(nickname);
            user.setPassword(password);
            user.setEmail(email);
            user.setPhone(phone);
            user.setRole("USER"); // 设置默认角色
            user.setStatus(1); // 设置默认状态为启用
            
            // 如果有头像文件，先上传头像
            if (avatar != null && !avatar.isEmpty()) {
                results uploadResult = userService.uploadAvatarForRegistration(avatar);
                if (uploadResult.getCode() == 200) {
                    user.setAvatarUrl((String) uploadResult.getData());
                }
            }
            
            results result = userService.register(user);
            Map<String, Object> response = new HashMap<>();
            response.put("code", result.getCode());
            response.put("msg", result.getMsg());
            response.put("data", result.getData());
            
            if (result.getCode() == 200) {
                return ResponseEntity.ok(response);
            } else {
                return ResponseEntity.badRequest().body(response);
            }
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("code", 500);
            response.put("msg", "注册失败: " + e.getMessage());
            response.put("data", null);
            return ResponseEntity.status(500).body(response);
        }
    }

    /**
     * 用户登录
     */
    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody Map<String, String> loginData) {
        String username = loginData.get("username");
        String password = loginData.get("password");
        
        results result = userService.login(username, password);
        Map<String, Object> response = new HashMap<>();
        response.put("code", result.getCode());
        response.put("msg", result.getMsg());
        
        if (result.getCode() == 200) {
            User user = (User) result.getData();
            // 生成JWT token
            String token = jwtUtil.generateToken(user.getId(), user.getUsername());
            
            Map<String, Object> userData = new HashMap<>();
            userData.put("id", user.getId());
            userData.put("username", user.getUsername());
            userData.put("nickname", user.getNickname());
            userData.put("email", user.getEmail());
            userData.put("phone", user.getPhone());
            userData.put("avatarUrl", user.getAvatarUrl());
            userData.put("signature", user.getSignature());
            userData.put("gender", user.getGender());
            userData.put("birthday", user.getBirthday() != null ? user.getBirthday().toString() : null);
            userData.put("coverUrl", user.getCoverUrl());
            userData.put("steamId", user.getSteamId());
            userData.put("steamPersonaName", user.getSteamPersonaName());
            userData.put("steamAvatarUrl", user.getSteamAvatarUrl());
            userData.put("steamPlaytimeMinutes", user.getSteamPlaytimeMinutes());
            userData.put("steamLevel", user.getSteamLevel());
            userData.put("steamAchievementsCount", user.getSteamAchievementsCount());
            userData.put("steamAchievementsTotal", user.getSteamAchievementsTotal());
            userData.put("role", user.getRole() != null ? user.getRole() : "USER");
            userData.put("isAdmin", "ADMIN".equalsIgnoreCase(user.getRole()));
            userData.put("token", token);
            
            response.put("data", userData);
            return ResponseEntity.ok(response);
        } else {
            response.put("data", null);
            return ResponseEntity.badRequest().body(response);
        }
    }

    /**
     * 上传头像
     */
    @PostMapping("/upload-avatar")
    public ResponseEntity<Map<String, Object>> uploadAvatar(
            @RequestParam("file") MultipartFile file,
            @RequestHeader("Authorization") String token) {
        
        try {
            // 验证token
            if (!jwtUtil.validateToken(token.substring(7))) {
                return ResponseEntity.status(401).body(Map.of(
                    "code", 401,
                    "msg", "认证失败",
                    "data", null
                ));
            }
            
            Long userId = jwtUtil.getUserIdFromToken(token.substring(7));
            results result = userService.uploadAvatar(userId, file);
            
            Map<String, Object> response = new HashMap<>();
            response.put("code", result.getCode());
            response.put("msg", result.getMsg());
            response.put("data", result.getData());
            
            if (result.getCode() == 200) {
                return ResponseEntity.ok(response);
            } else {
                return ResponseEntity.badRequest().body(response);
            }
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of(
                "code", 500,
                "msg", "上传失败: " + e.getMessage(),
                "data", null
            ));
        }
    }

    /**
     * 获取用户信息
     */
    
    /**
     * 上传个人主页背景封面
     */
    @PostMapping("/upload-cover")
    public ResponseEntity<Map<String, Object>> uploadCover(
            @RequestParam("file") org.springframework.web.multipart.MultipartFile file,
            @RequestHeader("Authorization") String token) {
        try {
            if (token == null || !token.startsWith("Bearer ") || !jwtUtil.validateToken(token.substring(7))) {
                return ResponseEntity.status(401).body(apiJson(401, "认证失败"));
            }
            Long userId = jwtUtil.getUserIdFromToken(token.substring(7));
            results result = userService.uploadCover(userId, file);
            Map<String, Object> response = new HashMap<>();
            response.put("code", result.getCode());
            response.put("msg", result.getMsg());
            response.put("data", result.getData());
            if (result.getCode() == 200) {
                return ResponseEntity.ok(response);
            }
            return ResponseEntity.badRequest().body(response);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(apiJson(500, "封面上传失败: " + e.getMessage()));
        }
    }

    /**
     * 公开主页：按用户 ID 返回可公开字段（无需登录）。
     * 不含邮箱、手机、密码、Steam 绑定等隐私信息。
     */
    @GetMapping("/{id}/public")
    public ResponseEntity<Map<String, Object>> getPublicProfile(@PathVariable("id") Long id) {
        try {
            if (id == null || id <= 0) {
                return ResponseEntity.ok(Map.of(
                    "code", 400,
                    "msg", "无效的用户 ID",
                    "data", null
                ));
            }
            results result = userService.getUserById(id);
            if (result.getCode() != 200 || result.getData() == null) {
                return ResponseEntity.ok(Map.of(
                    "code", 404,
                    "msg", "用户不存在",
                    "data", null
                ));
            }
            User user = (User) result.getData();
            if (user.getStatus() != null && user.getStatus() == 0) {
                return ResponseEntity.ok(Map.of(
                    "code", 404,
                    "msg", "用户不存在",
                    "data", null
                ));
            }
            Map<String, Object> data = new HashMap<>();
            data.put("id", user.getId());
            data.put("username", user.getUsername());
            data.put("nickname", user.getNickname());
            data.put("avatarUrl", user.getAvatarUrl());
            data.put("signature", user.getSignature());
            data.put("gender", user.getGender());
            data.put("birthday", user.getBirthday());
            data.put("coverUrl", user.getCoverUrl());
            data.put("role", user.getRole());
            data.put("isAdmin", user.getRole() != null && "ADMIN".equalsIgnoreCase(user.getRole()));
            data.put("createdAt", user.getCreatedAt());
            // Public Steam summary for other-user profile data tab
            if (user.getSteamId() != null) {
                data.put("steamId", user.getSteamId());
                data.put("steamName", user.getSteamPersonaName());
                data.put("steamPersonaName", user.getSteamPersonaName());
                data.put("steamAvatarUrl", user.getSteamAvatarUrl());
                data.put("steamLevel", user.getSteamLevel());
                data.put("steamPlaytimeMinutes", user.getSteamPlaytimeMinutes());
                data.put("steamAchievementsCount", user.getSteamAchievementsCount());
                data.put("steamAchievementsTotal", user.getSteamAchievementsTotal());
            }
            Map<String, Object> response = new HashMap<>();
            response.put("code", 200);
            response.put("msg", "获取成功");
            response.put("data", data);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of(
                "code", 500,
                "msg", "获取用户信息失败: " + e.getMessage(),
                "data", null
            ));
        }
    }

    @GetMapping("/profile")
    public ResponseEntity<Map<String, Object>> getProfile(@RequestHeader("Authorization") String token) {
        try {
            // 验证token
            if (!jwtUtil.validateToken(token.substring(7))) {
                return ResponseEntity.status(401).body(Map.of(
                    "code", 401,
                    "msg", "认证失败",
                    "data", null
                ));
            }
            
            Long userId = jwtUtil.getUserIdFromToken(token.substring(7));
            results result = userService.getUserById(userId);
            
            Map<String, Object> response = new HashMap<>();
            response.put("code", result.getCode());
            response.put("msg", result.getMsg());
            response.put("data", result.getData());
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of(
                "code", 500,
                "msg", "获取用户信息失败: " + e.getMessage(),
                "data", null
            ));
        }
    }


    /**
     * 更新社区用户个人资料（昵称/邮箱/手机/签名）
     */
    @PutMapping("/profile")
    public ResponseEntity<Map<String, Object>> updateProfile(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody Map<String, String> body) {
        try {
            String token = authHeader != null && authHeader.startsWith("Bearer ")
                    ? authHeader.substring(7) : null;
            if (token == null || !jwtUtil.validateToken(token)) {
                return ResponseEntity.status(401).body(apiJson(401, "认证失败"));
            }
            Long userId = jwtUtil.getUserIdFromToken(token);
            results result = userService.updateCommunityProfile(
                    userId,
                    body.get("nickname"),
                    body.get("email"),
                    body.get("phone"),
                    body.get("signature"),
                    body.get("gender"),
                    body.get("birthday"),
                    body.get("coverUrl")
            );
            Map<String, Object> response = new HashMap<>();
            response.put("code", result.getCode());
            response.put("msg", result.getMsg());
            response.put("data", result.getData());
            if (result.getCode() == 200) {
                return ResponseEntity.ok(response);
            }
            return ResponseEntity.badRequest().body(response);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(apiJson(500, "更新失败: " + e.getMessage()));
        }
    }

    /**
     * 修改社区用户密码
     */
    @PutMapping("/password")
    public ResponseEntity<Map<String, Object>> changePassword(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody Map<String, String> body) {
        try {
            String token = authHeader != null && authHeader.startsWith("Bearer ")
                    ? authHeader.substring(7) : null;
            if (token == null || !jwtUtil.validateToken(token)) {
                return ResponseEntity.status(401).body(apiJson(401, "认证失败"));
            }
            Long userId = jwtUtil.getUserIdFromToken(token);

            String oldPassword = body.get("oldPassword");
            String newPassword = body.get("newPassword");
            String confirmPassword = body.get("confirmPassword");
            if (confirmPassword != null && newPassword != null
                    && !newPassword.equals(confirmPassword)) {
                return ResponseEntity.badRequest().body(apiJson(400, "新密码和确认密码不一致"));
            }

            results result = userService.changePassword(userId, oldPassword, newPassword);
            Map<String, Object> response = new HashMap<>();
            response.put("code", result.getCode());
            response.put("msg", result.getMsg());
            response.put("data", result.getData());
            if (result.getCode() == 200) {
                return ResponseEntity.ok(response);
            }
            return ResponseEntity.badRequest().body(response);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(apiJson(500, "修改密码失败: " + e.getMessage()));
        }
    }

    /**
     * 获取“通过 Steam 绑定”跳转地址
     */
    @GetMapping("/steam/login-url")
    public ResponseEntity<Map<String, Object>> getSteamLoginUrl(
            @RequestHeader("Authorization") String authHeader) {
        String token = authHeader != null && authHeader.startsWith("Bearer ")
                ? authHeader.substring(7) : null;
        if (token == null || !jwtUtil.validateToken(token)) {
            return ResponseEntity.status(401).body(Map.of(
                    "code", 401,
                    "msg", "请先登录",
                    "data", null
            ));
        }

        String returnTo = steamReturnUrl + "?token=" + token;
        String steamOpenIdUrl =
                "https://steamcommunity.com/openid/login" +
                        "?openid.ns=" + urlEncode("http://specs.openid.net/auth/2.0") +
                        "&openid.mode=checkid_setup" +
                        "&openid.return_to=" + urlEncode(returnTo) +
                        "&openid.realm=" + urlEncode(steamRealm) +
                        "&openid.identity=" + urlEncode("http://specs.openid.net/auth/2.0/identifier_select") +
                        "&openid.claimed_id=" + urlEncode("http://specs.openid.net/auth/2.0/identifier_select");

        return ResponseEntity.ok(Map.of(
                "code", 200,
                "msg", "ok",
                "data", Map.of("url", steamOpenIdUrl)
        ));
    }

    private String urlEncode(String s) {
        try {
            return java.net.URLEncoder.encode(s, java.nio.charset.StandardCharsets.UTF_8.toString());
        } catch (Exception e) {
            return s;
        }
    }

    /**
     * Steam OpenID 回调（简化版，只解析 steamId 并绑定）
     */
    @GetMapping("/steam/callback")
    public ResponseEntity<Map<String, Object>> steamCallback(@RequestParam Map<String, String> params) {
        String token = params.get("token");
        if (token == null || !jwtUtil.validateToken(token)) {
            // 登录信息失效时直接给出简单提示页面
            return ResponseEntity.status(401).body(Map.of(
                    "code", 401,
                    "msg", "登录已失效，请重新在网站内发起绑定",
                    "data", null
            ));
        }

        String claimedId = params.get("openid.claimed_id");
        if (claimedId == null || !claimedId.contains("/")) {
            return ResponseEntity.badRequest().body(Map.of(
                    "code", 400,
                    "msg", "无效的 Steam 回调",
                    "data", null
            ));
        }
        String steamId = claimedId.substring(claimedId.lastIndexOf('/') + 1);

        Long userId = jwtUtil.getUserIdFromToken(token);
        results result = userService.bindSteam(userId, steamId);
        if (result.getCode() == 200) {
            // 绑定成功后回到前端设置页。站点根由 FRONTEND_BASE_URL 决定，不再写死 localhost。
            return ResponseEntity.status(302)
                    .header("Location", SteamBindRedirect.successLocation(frontendBaseUrl))
                    .build();
        } else {
            Map<String, Object> resp = new HashMap<>();
            resp.put("code", result.getCode());
            resp.put("msg", result.getMsg());
            resp.put("data", result.getData());
            return ResponseEntity.ok(resp);
        }
    }

    /**
     * 查询当前用户在蹄斗族群的总游戏时长
     */
    @GetMapping("/steam/playtime")
    public ResponseEntity<Map<String, Object>> getSteamPlaytime(
            @RequestHeader("Authorization") String authHeader,
            @RequestParam(value = "force", required = false) String forceParam) {
        // 手动刷新：?force=1 或 force=true，跳过 TTL 缓存，始终请求 Steam（写库仍受“只递增”规则约束）
        boolean forceRefresh = "1".equals(forceParam) || "true".equalsIgnoreCase(forceParam);
        String token = authHeader != null && authHeader.startsWith("Bearer ")
                ? authHeader.substring(7) : null;
        if (token == null || !jwtUtil.validateToken(token)) {
            return ResponseEntity.status(401).body(Map.of(
                    "code", 401,
                    "msg", "请先登录",
                    "data", null
            ));
        }
        Long userId = jwtUtil.getUserIdFromToken(token);
        User user = userService.findById(userId);
        if (user == null || user.getSteamId() == null) {
            return ResponseEntity.badRequest().body(Map.of(
                    "code", 400,
                    "msg", "请先绑定 Steam 账号",
                    "data", null
            ));
        }

        Integer cachedMinutes = user.getSteamPlaytimeMinutes();
        // 非 force：只读数据库已存数据，不请求 Steam（避免登录/轮询因网络或限流显示「刷新失败」）
        if (!forceRefresh) {
            int minutes = cachedMinutes != null ? cachedMinutes : 0;
            double hours = minutes / 60.0;
            Map<String, Object> data = new HashMap<>();
            data.put("steamId", user.getSteamId());
            data.put("playtime_minutes", minutes);
            data.put("playtime_hours", hours);
            data.put("personaName", user.getSteamPersonaName());
            data.put("avatarUrl", user.getSteamAvatarUrl());
            data.put("steamLevel", user.getSteamLevel());
            return ResponseEntity.ok(Map.of(
                    "code", 200,
                    "msg", "本地数据（点击刷新可从 Steam 更新）",
                    "data", data
            ));
        }

        // force=1：请求 Steam 并写库
        long minutesFromSteam;
        try {
            minutesFromSteam = fetchPlaytimeMinutes(user.getSteamId());
        } catch (Exception e) {
            // 调用 Steam 失败，如果有旧缓存则返回旧缓存，否则返回 0
            if (cachedMinutes != null) {
                double hours = cachedMinutes / 60.0;
                Map<String, Object> data = new HashMap<>();
                data.put("steamId", user.getSteamId());
                data.put("playtime_minutes", cachedMinutes);
                data.put("playtime_hours", hours);
                data.put("personaName", user.getSteamPersonaName());
                data.put("avatarUrl", user.getSteamAvatarUrl());
            data.put("steamLevel", user.getSteamLevel());
                return ResponseEntity.ok(Map.of(
                        "code", 200,
                        "msg", "使用上次缓存数据（本次从 Steam 获取失败）",
                        "data", data
                ));
            } else {
                Map<String, Object> data = new HashMap<>();
                data.put("steamId", user.getSteamId());
                data.put("playtime_minutes", 0);
                data.put("playtime_hours", 0.0);
                return ResponseEntity.ok(Map.of(
                        "code", 200,
                        "msg", "暂时无法从 Steam 获取数据，返回 0 小时",
                        "data", data
                ));
            }
        }

        // 认为获取成功，更新缓存并返回
        // 只允许“递增写入”：Steam 小于数据库缓存时，不写入 users/历史，避免回滚
        boolean allowWrite = cachedMinutes == null || minutesFromSteam >= cachedMinutes;
        if (!allowWrite) {
            long minutesToReturn = cachedMinutes != null ? cachedMinutes.longValue() : minutesFromSteam;
            double hours = minutesToReturn / 60.0;
            Map<String, Object> data = new HashMap<>();
            data.put("steamId", user.getSteamId());
            data.put("playtime_minutes", minutesToReturn);
            data.put("playtime_hours", hours);
            data.put("personaName", user.getSteamPersonaName());
            data.put("avatarUrl", user.getSteamAvatarUrl());
            data.put("steamLevel", user.getSteamLevel());
            return ResponseEntity.ok(Map.of(
                    "code", 200,
                    "msg", "查询成功（Steam 时长未增长：本次不更新缓存）",
                    "data", data
            ));
        }

        Map<String, String> profile = fetchSteamProfile(user.getSteamId());
        Integer steamLevel = fetchSteamLevel(user.getSteamId());
        User toUpdate = new User();
        toUpdate.setId(userId);
        toUpdate.setSteamPlaytimeMinutes((int) minutesFromSteam);
        toUpdate.setSteamPlaytimeUpdatedAt(java.time.LocalDateTime.now());
        if (profile != null) {
            toUpdate.setSteamPersonaName(profile.get("personaName"));
            toUpdate.setSteamAvatarUrl(profile.get("avatarUrl"));
        }
        if (steamLevel != null) {
            toUpdate.setSteamLevel(steamLevel);
        }
        userService.updateUser(toUpdate);

        // 写入历史快照：用于计算“两周内”增量
        try {
            SteamPlaytimeHistory history = new SteamPlaytimeHistory();
            history.setUserId(userId);
            history.setSteamId(user.getSteamId());
            history.setPlaytimeMinutes((int) minutesFromSteam);
            steamPlaytimeHistoryMapper.insert(history);
        } catch (Exception ignored) {
            // 不影响主流程
        }

        double hours = minutesFromSteam / 60.0;
        Map<String, Object> data = new HashMap<>();
        data.put("steamId", user.getSteamId());
        data.put("playtime_minutes", minutesFromSteam);
        data.put("playtime_hours", hours);
        if (profile != null) {
            data.put("personaName", profile.get("personaName"));
            data.put("avatarUrl", profile.get("avatarUrl"));
        }
        if (steamLevel != null) {
            data.put("steamLevel", steamLevel);
        } else if (user.getSteamLevel() != null) {
            data.put("steamLevel", user.getSteamLevel());
        }
        return ResponseEntity.ok(Map.of(
                "code", 200,
                "msg", "查询成功（已更新缓存）",
                "data", data
        ));
    }

    /**
     * 实时计算：最近两周内（基于两周前快照的累计时长增量）
     * 说明：Steam Web API 只给累计 playtime_forever，因此需要我们存“历史快照”才能计算两周增量。
     */
    @GetMapping("/steam/playtime/two-weeks")
    public ResponseEntity<Map<String, Object>> getSteamPlaytimeTwoWeeks(@RequestHeader("Authorization") String authHeader) {
        String token = authHeader != null && authHeader.startsWith("Bearer ")
                ? authHeader.substring(7) : null;
        if (token == null || !jwtUtil.validateToken(token)) {
            return ResponseEntity.status(401).body(apiJson(401, "请先登录"));
        }
        Long userId = jwtUtil.getUserIdFromToken(token);
        User user = userService.findById(userId);
        if (user == null || user.getSteamId() == null) {
            return ResponseEntity.badRequest().body(apiJson(400, "请先绑定 Steam 账号"));
        }

        // 计算区间起点（14天前）
        java.time.LocalDateTime fromTime = java.time.LocalDateTime.now().minusDays(14);

        Integer cachedMinutes = user.getSteamPlaytimeMinutes();
        LocalDateTime playtimeUpdatedAt = user.getSteamPlaytimeUpdatedAt();
        boolean cacheFresh = cachedMinutes != null && playtimeUpdatedAt != null
                && Duration.between(playtimeUpdatedAt, java.time.LocalDateTime.now()).toMinutes() >= 0
                && Duration.between(playtimeUpdatedAt, java.time.LocalDateTime.now()).toMinutes() <= playtimeCacheTtlMinutes;

        long currentMinutes;
        Map<String, String> profile = null;
        boolean needWriteSnapshot = false;
        if (cacheFresh && cachedMinutes != null) {
            currentMinutes = cachedMinutes.longValue();
        } else {
            try {
                currentMinutes = fetchPlaytimeMinutes(user.getSteamId());
                // 只允许“递增写入”：Steam 小于缓存时不写历史快照，避免回滚导致两周增量异常
                if (cachedMinutes != null && currentMinutes < cachedMinutes.longValue()) {
                    currentMinutes = cachedMinutes.longValue();
                    needWriteSnapshot = false;
                } else {
                    needWriteSnapshot = true;
                }
            } catch (Exception e) {
                if (cachedMinutes != null) {
                    currentMinutes = cachedMinutes.longValue();
                } else {
                    Map<String, Object> data = new HashMap<>();
                    data.put("steamId", user.getSteamId());
                    data.put("playtime_minutes_2w", 0);
                    data.put("playtime_hours_2w", 0.0);
                    data.put("available", false);
                    return ResponseEntity.ok(Map.of(
                            "code", 200,
                            "msg", "暂时无法从 Steam 获取数据（返回 0，并标记不可用）",
                            "data", data
                    ));
                }
            }
            if (needWriteSnapshot) {
                try {
                    SteamPlaytimeHistory history = new SteamPlaytimeHistory();
                    history.setUserId(userId);
                    history.setSteamId(user.getSteamId());
                    history.setPlaytimeMinutes((int) currentMinutes);
                    steamPlaytimeHistoryMapper.insert(history);
                } catch (Exception ignored) {
                }

                // 只有写入快照（说明本次确实去 Steam 拉了新时长）才同步一次 profile
                try {
                    profile = fetchSteamProfile(user.getSteamId());
                    Integer lvl = fetchSteamLevel(user.getSteamId());
                    if (profile != null || lvl != null) {
                        User pu = new User();
                        pu.setId(userId);
                        if (profile != null) {
                            if (profile.get("personaName") != null) pu.setSteamPersonaName(profile.get("personaName"));
                            if (profile.get("avatarUrl") != null) pu.setSteamAvatarUrl(profile.get("avatarUrl"));
                        }
                        if (lvl != null) pu.setSteamLevel(lvl);
                        userService.updateUser(pu);
                        if (lvl != null) user.setSteamLevel(lvl);
                    }
                } catch (Exception ignored) {
                }
            }
        }

        SteamPlaytimeHistory base = steamPlaytimeHistoryMapper.selectLatestBefore(userId, fromTime);

        String personaName = (profile != null && profile.get("personaName") != null)
                ? profile.get("personaName")
                : user.getSteamPersonaName();
        String avatarUrl = (profile != null && profile.get("avatarUrl") != null)
                ? profile.get("avatarUrl")
                : user.getSteamAvatarUrl();

        boolean available = base != null;
        long baseMinutes = base != null && base.getPlaytimeMinutes() != null ? base.getPlaytimeMinutes() : 0L;

        long deltaMinutes = currentMinutes - baseMinutes;
        if (deltaMinutes < 0) deltaMinutes = 0;
        double deltaHours = deltaMinutes / 60.0;

        Map<String, Object> data = new HashMap<>();
        data.put("steamId", user.getSteamId());
        data.put("personaName", personaName);
        data.put("avatarUrl", avatarUrl);
        data.put("steamLevel", user.getSteamLevel());
        data.put("playtime_minutes_2w", deltaMinutes);
        data.put("playtime_hours_2w", deltaHours);
        data.put("available", available);
        if (base != null) {
            data.put("base_minutes", baseMinutes);
            data.put("base_captured_at", base.getCapturedAt());
        } else {
            data.put("base_captured_at", null);
            data.put("msg", "缺少两周前快照，无法精确计算两周增量。请先每次刷新时长以积累历史。");
        }

        return ResponseEntity.ok(Map.of(
                "code", 200,
                "msg", available ? "计算成功" : "计算完成但不可用（缺少历史快照）",
                "data", data
        ));
    }

    /**
     * 获取当前用户在蹄斗族群的成就统计与已获得成就列表
     */
    @GetMapping("/steam/achievements")
    public ResponseEntity<Map<String, Object>> getSteamAchievements(
            @RequestHeader("Authorization") String authHeader,
            @RequestParam(value = "force", required = false) String forceParam) {
        boolean forceRefresh = "1".equals(forceParam) || "true".equalsIgnoreCase(forceParam);
        String token = authHeader != null && authHeader.startsWith("Bearer ")
                ? authHeader.substring(7) : null;
        if (token == null || !jwtUtil.validateToken(token)) {
            return ResponseEntity.status(401).body(Map.of(
                    "code", 401,
                    "msg", "请先登录",
                    "data", null
            ));
        }
        Long userId = jwtUtil.getUserIdFromToken(token);
        User user = userService.findById(userId);
        if (user == null || user.getSteamId() == null) {
            return ResponseEntity.badRequest().body(Map.of(
                    "code", 400,
                    "msg", "请先绑定 Steam 账号",
                    "data", null
            ));
        }

        // 用户端不再触发 Steam schema 拉取：只从数据库全量成就库加载（由管理端按钮同步）
        // 若库为空，则退化为仅展示已获得列表（兼容）
        ensureAchievementSchemaLoaded();

        // 非 force：不请求 Steam 玩家成就，只基于数据库缓存“点亮哪些成就”
        if (!forceRefresh) {
            Map<String, Object> data = buildAchievementDataFromCacheAndSchema(user);
            return ResponseEntity.ok(Map.of(
                    "code", 200,
                    "msg", "本地数据（点击刷新可从 Steam 更新）",
                    "data", data
            ));
        }

        try {
            List<Map<String, Object>> player = fetchPlayerAchievements(user.getSteamId(), "schinese");

            int total = achvSchemaCache.size();
            int achievedCount = 0;
            List<Map<String, Object>> achievedList = new ArrayList<>();
            Map<String, Object> achievedMeta = new HashMap<>(); // apiname -> unlocktime
            for (Map<String, Object> a : player) {
                Object achievedObj = a.get("achieved");
                int achieved = achievedObj == null ? 0 : Integer.parseInt(achievedObj.toString());
                if (achieved == 1) {
                    achievedCount++;
                    String apiName = a.get("apiname") != null ? a.get("apiname").toString() : null;
                    if (apiName != null) {
                        achievedMeta.put(apiName, a.get("unlocktime"));
                    }
                    Map<String, Object> schema = apiName != null ? achvSchemaCache.get(apiName) : null;
                    Map<String, Object> item = new HashMap<>();
                    item.put("apiName", apiName);
                    item.put("unlockTime", a.get("unlocktime"));
                    if (schema != null) {
                        item.put("name", schema.get("displayName"));
                        item.put("desc", schema.get("description"));
                        item.put("icon", schema.get("icon"));
                        item.put("iconGray", schema.get("icongray"));
                    }
                    achievedList.add(item);
                }
            }

            Map<String, Object> data = buildFullAchievementData(user.getSteamId(), total, achievedCount, achievedMeta);

            // 只允许“递增写入”缓存：新成就数 >= 旧成就数时才更新数据库
            Integer cachedAchieved = user.getSteamAchievementsCount();
            boolean allowWrite = cachedAchieved == null || achievedCount >= cachedAchieved;
            if (allowWrite) {
                User toUpdate = new User();
                toUpdate.setId(userId);
                toUpdate.setSteamAchievementsTotal(total);
                toUpdate.setSteamAchievementsCount(achievedCount);
                toUpdate.setSteamAchievementsUpdatedAt(LocalDateTime.now());
                try {
                    toUpdate.setSteamAchievementsJson(JSON.writeValueAsString(achievedList));
                    userService.updateUser(toUpdate);
                } catch (Exception ignored) {
                    // 写缓存失败不影响接口可用性
                }
            } else {
                // Steam 本次返回成就数更少：不覆盖数据库，返回旧缓存，避免回滚体验
                data = buildAchievementDataFromCacheAndSchema(user);
            }
            return ResponseEntity.ok(Map.of(
                    "code", 200,
                    "msg", "查询成功",
                    "data", data
            ));
        } catch (Exception e) {
            // 失败时优先返回旧缓存（若存在）
            if (user.getSteamAchievementsCount() != null || user.getSteamAchievementsTotal() != null) {
                Map<String, Object> data = buildAchievementDataFromCacheAndSchema(user);
                return ResponseEntity.ok(Map.of(
                        "code", 200,
                        "msg", "查询成功",
                        "data", data
                ));
            }
            return ResponseEntity.ok(Map.of(
                    "code", 200,
                    "msg", "暂时无法从 Steam 获取成就数据",
                    "data", Map.of(
                            "steamId", user.getSteamId(),
                            "total", 0,
                            "achieved", 0,
                            "achievements", List.of()
                    )
            ));
        }
    }

    /**
     * 从 users 表缓存（steam_achievements_json / count / total） + schemaCache 组装“全量成就列表”。
     * 若 schemaCache 不可用，则退化为仅返回缓存的已获得列表（兼容旧前端）。
     */
    private Map<String, Object> buildAchievementDataFromCacheAndSchema(User user) {
        int totalCached = user.getSteamAchievementsTotal() != null ? user.getSteamAchievementsTotal() : 0;
        int achievedCached = user.getSteamAchievementsCount() != null ? user.getSteamAchievementsCount() : 0;
        List<Map<String, Object>> achievedList = List.of();
        String json = user.getSteamAchievementsJson();
        if (json != null && !json.isBlank()) {
            try {
                achievedList = JSON.readValue(json, new TypeReference<List<Map<String, Object>>>() {});
            } catch (Exception ignored) {
                achievedList = List.of();
            }
        }

        // schema 不可用：保持旧格式（只给 achievedList）
        if (achvSchemaCache.isEmpty()) {
            Map<String, Object> data = new HashMap<>();
            data.put("steamId", user.getSteamId());
            data.put("total", totalCached);
            data.put("achieved", achievedCached);
            data.put("achievements", achievedList);
            return data;
        }

        Set<String> achievedApiNames = new HashSet<>();
        for (Map<String, Object> a : achievedList) {
            Object api = a != null ? a.get("apiName") : null;
            if (api != null) achievedApiNames.add(api.toString());
        }

        // total 优先用 schema 的 size，更准确
        int total = achvSchemaCache.size();
        int achieved = achievedCached > 0 ? achievedCached : achievedApiNames.size();

        // unlockTime：缓存里有就带上
        Map<String, Object> achievedMeta = new HashMap<>();
        for (Map<String, Object> a : achievedList) {
            if (a == null) continue;
            Object api = a.get("apiName");
            if (api == null) continue;
            achievedMeta.put(api.toString(), a.get("unlockTime"));
        }

        return buildFullAchievementData(user.getSteamId(), total, achieved, achievedMeta);
    }

    /** 根据 schemaCache + achievedMeta（apiname->unlocktime）组装全量成就数据 */
    private Map<String, Object> buildFullAchievementData(Long steamId, int total, int achieved, Map<String, Object> achievedMeta) {
        Map<String, Object> meta = achievedMeta != null ? achievedMeta : Map.of();
        List<Map<String, Object>> all = new ArrayList<>(achvSchemaCache.size());
        for (Map.Entry<String, Map<String, Object>> e : achvSchemaCache.entrySet()) {
            String apiName = e.getKey();
            Map<String, Object> schema = e.getValue();
            Map<String, Object> item = new HashMap<>();
            item.put("apiName", apiName);
            item.put("name", schema != null ? schema.get("displayName") : null);
            item.put("desc", schema != null ? schema.get("description") : null);
            item.put("icon", schema != null ? schema.get("icon") : null);
            item.put("iconGray", schema != null ? schema.get("icongray") : null);
            boolean isAchieved = apiName != null && meta.containsKey(apiName);
            item.put("achieved", isAchieved);
            if (isAchieved) {
                item.put("unlockTime", meta.get(apiName));
            }
            all.add(item);
        }

        Map<String, Object> data = new HashMap<>();
        data.put("steamId", steamId);
        data.put("total", total);
        data.put("achieved", achieved);
        data.put("achievements", all);
        return data;
    }

    /**
     * 解除 Steam 绑定
     */
    @PostMapping("/steam/unbind")
    public ResponseEntity<Map<String, Object>> unbindSteam(@RequestHeader("Authorization") String authHeader) {
        String token = authHeader != null && authHeader.startsWith("Bearer ")
                ? authHeader.substring(7) : null;
        if (token == null || !jwtUtil.validateToken(token)) {
            return ResponseEntity.status(401).body(apiJson(401, "请先登录"));
        }
        Long userId = jwtUtil.getUserIdFromToken(token);
        results result = userService.unbindSteam(userId);
        Map<String, Object> resp = new HashMap<>();
        resp.put("code", result.getCode());
        resp.put("msg", result.getMsg());
        resp.put("data", result.getData()); // 允许为 null
        return ResponseEntity.ok(resp);
    }

    private void ensureAchievementSchemaLoaded() {
        Instant loadedAt = achvSchemaLoadedAt;
        if (loadedAt != null && Instant.now().isBefore(loadedAt.plus(ACHV_SCHEMA_TTL)) && !achvSchemaCache.isEmpty()) {
            return;
        }
        synchronized (UserController.class) {
            Instant loadedAt2 = achvSchemaLoadedAt;
            if (loadedAt2 != null && Instant.now().isBefore(loadedAt2.plus(ACHV_SCHEMA_TTL)) && !achvSchemaCache.isEmpty()) {
                return;
            }
            try {
                if (steamAppId == null || steamAppId <= 0) {
                    return;
                }
                List<GameAchievementSchema> rows = gameAchievementSchemaMapper.selectByAppId(steamAppId);
                if (rows == null || rows.isEmpty()) {
                    return; // 未同步全量成就库
                }
                Map<String, Map<String, Object>> schema = new HashMap<>();
                for (GameAchievementSchema r : rows) {
                    if (r == null || r.getApiName() == null) continue;
                    Map<String, Object> info = new HashMap<>();
                    info.put("displayName", r.getDisplayName());
                    info.put("description", r.getDescription());
                    info.put("icon", r.getIconUrl());
                    info.put("icongray", r.getIconGrayUrl());
                    schema.put(r.getApiName(), info);
                }
                achvSchemaCache.clear();
                achvSchemaCache.putAll(schema);
                achvSchemaLoadedAt = Instant.now();
            } catch (Exception ignored) {
                // ignore
            }
        }
    }

    private Map<String, Map<String, Object>> fetchAchievementSchema(String lang) {
        String url = "https://api.steampowered.com/ISteamUserStats/GetSchemaForGame/v2/"
                + "?key=" + steamApiKey
                + "&appid=" + steamAppId
                + (lang != null ? "&l=" + lang : "");
        org.springframework.web.client.RestTemplate restTemplate = new org.springframework.web.client.RestTemplate();
        @SuppressWarnings("unchecked")
        Map<String, Object> resp = restTemplate.getForObject(url, Map.class);
        Map<String, Map<String, Object>> out = new HashMap<>();
        if (resp == null) return out;
        Object gameObj = resp.get("game");
        if (!(gameObj instanceof Map)) return out;
        @SuppressWarnings("unchecked")
        Map<String, Object> game = (Map<String, Object>) gameObj;
        Object statsObj = game.get("availableGameStats");
        if (!(statsObj instanceof Map)) return out;
        @SuppressWarnings("unchecked")
        Map<String, Object> stats = (Map<String, Object>) statsObj;
        Object achvObj = stats.get("achievements");
        if (!(achvObj instanceof List)) return out;
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> achvs = (List<Map<String, Object>>) achvObj;
        for (Map<String, Object> a : achvs) {
            String apiName = a.get("name") != null ? a.get("name").toString() : null;
            if (apiName == null) continue;
            Map<String, Object> info = new HashMap<>();
            info.put("displayName", a.get("displayName"));
            info.put("description", a.get("description"));
            // icon/icongray：优先尝试转存到 OSS（固定 objectKey，已存在则跳过上传）
            String icon = a.get("icon") != null ? a.get("icon").toString() : null;
            String iconGray = a.get("icongray") != null ? a.get("icongray").toString() : null;
            info.put("icon", toOssOrKeepSteam(icon, apiName, false));
            info.put("icongray", toOssOrKeepSteam(iconGray, apiName, true));
            out.put(apiName, info);
        }
        return out;
    }

    /**
     * 将 Steam CDN 图标转存到 OSS，并返回 OSS URL；失败则返回原 URL
     */
    private String toOssOrKeepSteam(String url, String apiName, boolean gray) {
        if (url == null || url.isBlank()) return url;
        if (ossUtil == null) return url;
        if (steamAppId == null) return url;
        if (apiName == null || apiName.isBlank()) return url;

        String fileName = gray ? "icongray.jpg" : "icon.jpg";
        String objectKey = "steam/achievements/" + steamAppId + "/" + apiName + "/" + fileName;
        try {
            if (ossUtil.exists(objectKey)) {
                return "https://tfhers.oss-cn-beijing.aliyuncs.com/" + objectKey;
            }
            try (InputStream in = new URL(url).openStream()) {
                return ossUtil.uploadStream(in, objectKey, "image/jpeg");
            }
        } catch (Exception ignored) {
            return url;
        }
    }

    private List<Map<String, Object>> fetchPlayerAchievements(Long steamId, String lang) {
        String url = "https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v1/"
                + "?key=" + steamApiKey
                + "&steamid=" + steamId
                + "&appid=" + steamAppId
                + (lang != null ? "&l=" + lang : "");
        org.springframework.web.client.RestTemplate restTemplate = new org.springframework.web.client.RestTemplate();
        @SuppressWarnings("unchecked")
        Map<String, Object> resp = restTemplate.getForObject(url, Map.class);
        if (resp == null) return List.of();
        Object psObj = resp.get("playerstats");
        if (!(psObj instanceof Map)) return List.of();
        @SuppressWarnings("unchecked")
        Map<String, Object> ps = (Map<String, Object>) psObj;
        Object achvObj = ps.get("achievements");
        if (!(achvObj instanceof List)) return List.of();
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> achvs = (List<Map<String, Object>>) achvObj;
        return achvs != null ? achvs : List.of();
    }

    private long fetchPlaytimeMinutes(Long steamId) throws Exception {
        String url = "https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/"
                + "?key=" + steamApiKey
                + "&steamid=" + steamId
                + "&include_played_free_games=1"
                + "&appids_filter[0]=" + steamAppId
                + "&format=json";

        org.springframework.web.client.RestTemplate restTemplate = new org.springframework.web.client.RestTemplate();
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> resp = restTemplate.getForObject(url, Map.class);
            if (resp == null) return 0L;
            Object respObj = resp.get("response");
            if (!(respObj instanceof Map)) return 0L;

            @SuppressWarnings("unchecked")
            Map<String, Object> response = (Map<String, Object>) respObj;
            Object gamesObj = response.get("games");
            if (!(gamesObj instanceof java.util.List)) return 0L;

            @SuppressWarnings("unchecked")
            java.util.List<Map<String, Object>> games =
                    (java.util.List<Map<String, Object>>) gamesObj;
            if (games == null || games.isEmpty()) return 0L;

            Object pt = games.get(0).get("playtime_forever");
            if (pt == null) return 0L;
            return Long.parseLong(pt.toString());
        } catch (org.springframework.web.client.RestClientException e) {
            // 调用失败（如隐私设置、网络问题），视为 0 分钟，不抛出 500
            return 0L;
        }
    }


    /**
     * 获取 Steam 账号等级（IPlayerService/GetSteamLevel/v1，需 API Key + steamid）。
     * 资料设为私密时仍通常可取等级；失败返回 null。
     */
    private Integer fetchSteamLevel(Long steamId) {
        if (steamId == null || steamApiKey == null || steamApiKey.isBlank()) return null;
        String url = "https://api.steampowered.com/IPlayerService/GetSteamLevel/v1/"
                + "?key=" + steamApiKey
                + "&steamid=" + steamId;
        org.springframework.web.client.RestTemplate restTemplate = new org.springframework.web.client.RestTemplate();
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> resp = restTemplate.getForObject(url, Map.class);
            if (resp == null) return null;
            Object respObj = resp.get("response");
            if (!(respObj instanceof Map)) return null;
            @SuppressWarnings("unchecked")
            Map<String, Object> response = (Map<String, Object>) respObj;
            Object levelObj = response.get("player_level");
            if (levelObj == null) return null;
            if (levelObj instanceof Number) return ((Number) levelObj).intValue();
            try {
                return Integer.parseInt(levelObj.toString());
            } catch (NumberFormatException e) {
                return null;
            }
        } catch (org.springframework.web.client.RestClientException e) {
            return null;
        }
    }

    /**
     * 获取 Steam 昵称和头像（可选）
     */
    private Map<String, String> fetchSteamProfile(Long steamId) {
        String url = "https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/"
                + "?key=" + steamApiKey
                + "&steamids=" + steamId;
        org.springframework.web.client.RestTemplate restTemplate = new org.springframework.web.client.RestTemplate();
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> resp = restTemplate.getForObject(url, Map.class);
            if (resp == null) return null;
            Object respObj = resp.get("response");
            if (!(respObj instanceof Map)) return null;
            @SuppressWarnings("unchecked")
            Map<String, Object> response = (Map<String, Object>) respObj;
            Object playersObj = response.get("players");
            if (!(playersObj instanceof java.util.List)) return null;
            @SuppressWarnings("unchecked")
            java.util.List<Map<String, Object>> players =
                    (java.util.List<Map<String, Object>>) playersObj;
            if (players.isEmpty()) return null;
            Map<String, Object> p = players.get(0);
            String personaName = p.get("personaname") != null ? p.get("personaname").toString() : null;
            String avatarUrl = p.get("avatarfull") != null ? p.get("avatarfull").toString() : null;
            Map<String, String> result = new HashMap<>();
            result.put("personaName", personaName);
            result.put("avatarUrl", avatarUrl);
            return result;
        } catch (org.springframework.web.client.RestClientException e) {
            return null;
        }
    }
}
