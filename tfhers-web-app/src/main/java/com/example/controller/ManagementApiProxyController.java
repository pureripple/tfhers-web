package com.example.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.*;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.core.io.ByteArrayResource;

import java.util.HashMap;
import java.util.Map;

/**
 * 将社区端常用的管理端 API（用户 / 角色教程）代理到 management，
 * 便于本地只打开 8080、或 Nginx 同源反代时前端 managementApiUrl 留空。
 */
@RestController
public class ManagementApiProxyController {

    @Autowired
    private RestTemplate restTemplate;

    @Value("${tfhers.management.base-url:http://localhost:8081}")
    private String managementBaseUrl;

    private String base() {
        String b = managementBaseUrl == null ? "" : managementBaseUrl.trim();
        if (b.endsWith("/")) {
            b = b.substring(0, b.length() - 1);
        }
        return b;
    }

    private static Map<String, Object> apiJson(int code, String msg) {
        Map<String, Object> m = new HashMap<>();
        m.put("code", code);
        m.put("msg", msg);
        m.put("data", null);
        return m;
    }

    private ResponseEntity<Map<String, Object>> forward(String path, HttpMethod method,
                                                        HttpHeaders headers, Object body) {
        String url = base() + path;
        try {
            HttpEntity<?> entity = body == null ? new HttpEntity<>(headers) : new HttpEntity<>(body, headers);
            ResponseEntity<Map<String, Object>> resp = restTemplate.exchange(
                    url, method, entity, new ParameterizedTypeReference<Map<String, Object>>() {});
            return ResponseEntity.status(resp.getStatusCode()).body(resp.getBody());
        } catch (HttpStatusCodeException e) {
            try {
                @SuppressWarnings("unchecked")
                Map<String, Object> parsed = new com.fasterxml.jackson.databind.ObjectMapper()
                        .readValue(e.getResponseBodyAsString(), Map.class);
                Object msg = parsed.get("msg");
                if (msg == null || msg.toString().isBlank()) {
                    Object message = parsed.get("message");
                    if (message != null) {
                        parsed.put("msg", message.toString());
                    } else {
                        parsed.put("msg", "请求失败（HTTP " + e.getStatusCode().value() + "）");
                    }
                }
                return ResponseEntity.status(e.getStatusCode()).body(parsed);
            } catch (Exception ignored) {
                return ResponseEntity.status(e.getStatusCode())
                        .body(apiJson(e.getStatusCode().value(),
                                e.getStatusText() != null && !e.getStatusText().isBlank()
                                        ? e.getStatusText()
                                        : "请求失败（HTTP " + e.getStatusCode().value() + "）"));
            }
        } catch (Exception e) {
            return ResponseEntity.status(502).body(apiJson(502,
                    "无法连接管理端(" + base() + "): " + (e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName())));
        }
    }

    private HttpHeaders copyAuth(String authHeader) {
        HttpHeaders headers = new HttpHeaders();
        if (authHeader != null && !authHeader.isBlank()) {
            headers.set("Authorization", authHeader);
        }
        return headers;
    }

    // ---------- characters (教程页) ----------
    @GetMapping("/api/characters")
    public ResponseEntity<Map<String, Object>> listCharacters() {
        return forward("/api/characters", HttpMethod.GET, new HttpHeaders(), null);
    }

    @GetMapping("/api/characters/{id}")
    public ResponseEntity<Map<String, Object>> getCharacter(@PathVariable Long id) {
        return forward("/api/characters/" + id, HttpMethod.GET, new HttpHeaders(), null);
    }

    // ---------- user login / register / profile ----------
    @PostMapping("/api/user/login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody Map<String, String> body) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        return forward("/api/user/login", HttpMethod.POST, headers, body);
    }

    @PostMapping(value = "/api/user/register", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, Object>> register(
            @RequestParam("username") String username,
            @RequestParam("nickname") String nickname,
            @RequestParam("password") String password,
            @RequestParam(value = "email", required = false) String email,
            @RequestParam(value = "phone", required = false) String phone,
            @RequestParam(value = "avatar", required = false) MultipartFile avatar) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);
            MultiValueMap<String, Object> form = new LinkedMultiValueMap<>();
            form.add("username", username);
            form.add("nickname", nickname);
            form.add("password", password);
            if (email != null) form.add("email", email);
            if (phone != null) form.add("phone", phone);
            if (avatar != null && !avatar.isEmpty()) {
                ByteArrayResource resource = new ByteArrayResource(avatar.getBytes()) {
                    @Override
                    public String getFilename() {
                        return avatar.getOriginalFilename() != null ? avatar.getOriginalFilename() : "avatar.png";
                    }
                };
                form.add("avatar", resource);
            }
            return forward("/api/user/register", HttpMethod.POST, headers, form);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(apiJson(500, "注册代理失败: " + e.getMessage()));
        }
    }

    @GetMapping("/api/user/profile")
    public ResponseEntity<Map<String, Object>> profile(@RequestHeader(value = "Authorization", required = false) String auth) {
        return forward("/api/user/profile", HttpMethod.GET, copyAuth(auth), null);
    }

    @PutMapping("/api/user/profile")
    public ResponseEntity<Map<String, Object>> updateProfile(
            @RequestHeader(value = "Authorization", required = false) String auth,
            @RequestBody Map<String, Object> body) {
        HttpHeaders headers = copyAuth(auth);
        headers.setContentType(MediaType.APPLICATION_JSON);
        return forward("/api/user/profile", HttpMethod.PUT, headers, body);
    }

    @PutMapping("/api/user/password")
    public ResponseEntity<Map<String, Object>> changePassword(
            @RequestHeader(value = "Authorization", required = false) String auth,
            @RequestBody Map<String, Object> body) {
        HttpHeaders headers = copyAuth(auth);
        headers.setContentType(MediaType.APPLICATION_JSON);
        return forward("/api/user/password", HttpMethod.PUT, headers, body);
    }


    // ---------- combos (用户连段) ----------
    @GetMapping("/api/combos/mine")
    public ResponseEntity<Map<String, Object>> myCombos(
            @RequestHeader(value = "Authorization", required = false) String auth) {
        return forward("/api/combos/mine", HttpMethod.GET, copyAuth(auth), null);
    }

    @PostMapping("/api/combos")
    public ResponseEntity<Map<String, Object>> submitCombo(
            @RequestHeader(value = "Authorization", required = false) String auth,
            @RequestBody Map<String, Object> body) {
        HttpHeaders headers = copyAuth(auth);
        headers.setContentType(MediaType.APPLICATION_JSON);
        return forward("/api/combos", HttpMethod.POST, headers, body != null ? body : new HashMap<>());
    }

    @DeleteMapping("/api/combos/{id}")
    public ResponseEntity<Map<String, Object>> deleteMyCombo(
            @PathVariable Long id,
            @RequestHeader(value = "Authorization", required = false) String auth) {
        return forward("/api/combos/" + id, HttpMethod.DELETE, copyAuth(auth), null);
    }

    // ---------- tournaments (赛事) ----------
    @GetMapping("/api/tournaments")
    public ResponseEntity<Map<String, Object>> listTournaments(
            @RequestHeader(value = "Authorization", required = false) String auth) {
        return forward("/api/tournaments", HttpMethod.GET, copyAuth(auth), null);
    }

    @GetMapping("/api/tournaments/{id}")
    public ResponseEntity<Map<String, Object>> getTournament(
            @PathVariable Long id,
            @RequestHeader(value = "Authorization", required = false) String auth) {
        return forward("/api/tournaments/" + id, HttpMethod.GET, copyAuth(auth), null);
    }

    @GetMapping("/api/tournaments/{id}/bracket")
    public ResponseEntity<Map<String, Object>> getTournamentBracket(@PathVariable Long id) {
        return forward("/api/tournaments/" + id + "/bracket", HttpMethod.GET, new HttpHeaders(), null);
    }

    @PostMapping("/api/tournaments/{id}/register")
    public ResponseEntity<Map<String, Object>> registerTournament(
            @PathVariable Long id,
            @RequestHeader(value = "Authorization", required = false) String auth) {
        HttpHeaders headers = copyAuth(auth);
        headers.setContentType(MediaType.APPLICATION_JSON);
        return forward("/api/tournaments/" + id + "/register", HttpMethod.POST, headers, new HashMap<>());
    }

    @DeleteMapping("/api/tournaments/{id}/register")
    public ResponseEntity<Map<String, Object>> withdrawTournament(
            @PathVariable Long id,
            @RequestHeader(value = "Authorization", required = false) String auth) {
        return forward("/api/tournaments/" + id + "/register", HttpMethod.DELETE, copyAuth(auth), null);
    }

    // ---------- rankings (排位榜) ----------
    @GetMapping("/api/rankings")
    public ResponseEntity<Map<String, Object>> rankings(
            @RequestParam(value = "limit", defaultValue = "50") int limit) {
        return forward("/api/rankings?limit=" + limit, HttpMethod.GET, new HttpHeaders(), null);
    }

    @GetMapping("/api/user/rating")
    public ResponseEntity<Map<String, Object>> userRating(
            @RequestHeader(value = "Authorization", required = false) String auth) {
        return forward("/api/user/rating", HttpMethod.GET, copyAuth(auth), null);
    }

    // ---------- rooms (房间大厅) ----------
    @GetMapping("/api/rooms")
    public ResponseEntity<Map<String, Object>> listRooms(
            @RequestHeader(value = "Authorization", required = false) String auth) {
        return forward("/api/rooms", HttpMethod.GET, copyAuth(auth), null);
    }

    @PostMapping("/api/rooms")
    public ResponseEntity<Map<String, Object>> createRoom(
            @RequestHeader(value = "Authorization", required = false) String auth,
            @RequestBody Map<String, Object> body) {
        HttpHeaders headers = copyAuth(auth);
        headers.setContentType(MediaType.APPLICATION_JSON);
        return forward("/api/rooms", HttpMethod.POST, headers, body != null ? body : new HashMap<>());
    }

    @GetMapping("/api/rooms/{id}")
    public ResponseEntity<Map<String, Object>> getRoom(
            @PathVariable Long id,
            @RequestHeader(value = "Authorization", required = false) String auth) {
        return forward("/api/rooms/" + id, HttpMethod.GET, copyAuth(auth), null);
    }

    @PostMapping("/api/rooms/{id}/join")
    public ResponseEntity<Map<String, Object>> joinRoom(
            @PathVariable Long id,
            @RequestHeader(value = "Authorization", required = false) String auth,
            @RequestBody(required = false) Map<String, Object> body) {
        HttpHeaders headers = copyAuth(auth);
        headers.setContentType(MediaType.APPLICATION_JSON);
        return forward("/api/rooms/" + id + "/join", HttpMethod.POST, headers, body != null ? body : new HashMap<>());
    }

    @PostMapping("/api/rooms/{id}/leave")
    public ResponseEntity<Map<String, Object>> leaveRoom(
            @PathVariable Long id,
            @RequestHeader(value = "Authorization", required = false) String auth) {
        HttpHeaders headers = copyAuth(auth);
        headers.setContentType(MediaType.APPLICATION_JSON);
        return forward("/api/rooms/" + id + "/leave", HttpMethod.POST, headers, new HashMap<>());
    }

    @PostMapping("/api/rooms/{id}/close")
    public ResponseEntity<Map<String, Object>> closeRoom(
            @PathVariable Long id,
            @RequestHeader(value = "Authorization", required = false) String auth) {
        HttpHeaders headers = copyAuth(auth);
        headers.setContentType(MediaType.APPLICATION_JSON);
        return forward("/api/rooms/" + id + "/close", HttpMethod.POST, headers, new HashMap<>());
    }

    @GetMapping("/api/rooms/{id}/members")
    public ResponseEntity<Map<String, Object>> roomMembers(
            @PathVariable Long id,
            @RequestHeader(value = "Authorization", required = false) String auth) {
        return forward("/api/rooms/" + id + "/members", HttpMethod.GET, copyAuth(auth), null);
    }

    @GetMapping("/api/rooms/{id}/messages")
    public ResponseEntity<Map<String, Object>> roomMessages(
            @PathVariable Long id,
            @RequestParam(value = "afterId", required = false, defaultValue = "0") Long afterId,
            @RequestHeader(value = "Authorization", required = false) String auth) {
        return forward("/api/rooms/" + id + "/messages?afterId=" + (afterId != null ? afterId : 0),
                HttpMethod.GET, copyAuth(auth), null);
    }

    @PostMapping("/api/rooms/{id}/messages")
    public ResponseEntity<Map<String, Object>> postRoomMessage(
            @PathVariable Long id,
            @RequestHeader(value = "Authorization", required = false) String auth,
            @RequestBody Map<String, Object> body) {
        HttpHeaders headers = copyAuth(auth);
        headers.setContentType(MediaType.APPLICATION_JSON);
        return forward("/api/rooms/" + id + "/messages", HttpMethod.POST, headers, body != null ? body : new HashMap<>());
    }
}

