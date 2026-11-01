package com.example.controller;

import com.example.pojo.results;
import com.example.service.RoomService;
import com.example.util.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import java.util.Map;

/**
 * 社区端房间大厅：建房 / 进房 / 聊天（约战联络，非游戏内匹配）
 */
@RestController
@RequestMapping("/api/rooms")
public class RoomPublicController {

    @Autowired
    private RoomService roomService;

    @Autowired
    private JwtUtil jwtUtil;

    @GetMapping
    public results list(HttpServletRequest request) {
        try {
            Long userId = requireUserId(request);
            if (userId == null) {
                return results.error(401, "请先登录");
            }
            return roomService.listRooms(userId);
        } catch (Exception e) {
            e.printStackTrace();
            return results.error("获取房间列表失败: " + e.getMessage());
        }
    }

    @PostMapping
    public results create(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        try {
            Long userId = requireUserId(request);
            if (userId == null) {
                return results.error(401, "请先登录");
            }
            String title = body != null && body.get("title") != null ? String.valueOf(body.get("title")) : null;
            String password = body != null && body.get("password") != null ? String.valueOf(body.get("password")) : null;
            Integer maxPlayers = null;
            if (body != null && body.get("maxPlayers") != null) {
                Object mp = body.get("maxPlayers");
                if (mp instanceof Number) {
                    maxPlayers = ((Number) mp).intValue();
                } else {
                    try {
                        maxPlayers = Integer.parseInt(String.valueOf(mp).trim());
                    } catch (Exception ignored) {
                    }
                }
            }
            return roomService.createRoom(userId, title, password, maxPlayers);
        } catch (Exception e) {
            e.printStackTrace();
            return results.error("创建房间失败: " + e.getMessage());
        }
    }

    @GetMapping("/{id}")
    public results detail(@PathVariable Long id, HttpServletRequest request) {
        try {
            Long userId = requireUserId(request);
            if (userId == null) {
                return results.error(401, "请先登录");
            }
            return roomService.getRoomDetail(id, userId);
        } catch (Exception e) {
            e.printStackTrace();
            return results.error("获取房间详情失败: " + e.getMessage());
        }
    }

    @PostMapping("/{id}/join")
    public results join(@PathVariable Long id,
                        @RequestBody(required = false) Map<String, Object> body,
                        HttpServletRequest request) {
        try {
            Long userId = requireUserId(request);
            if (userId == null) {
                return results.error(401, "请先登录");
            }
            String password = null;
            if (body != null && body.get("password") != null) {
                password = String.valueOf(body.get("password"));
            }
            return roomService.joinRoom(id, userId, password);
        } catch (Exception e) {
            e.printStackTrace();
            return results.error("加入房间失败: " + e.getMessage());
        }
    }

    @PostMapping("/{id}/leave")
    public results leave(@PathVariable Long id, HttpServletRequest request) {
        try {
            Long userId = requireUserId(request);
            if (userId == null) {
                return results.error(401, "请先登录");
            }
            return roomService.leaveRoom(id, userId);
        } catch (Exception e) {
            e.printStackTrace();
            return results.error("离开房间失败: " + e.getMessage());
        }
    }

    @PostMapping("/{id}/close")
    public results close(@PathVariable Long id, HttpServletRequest request) {
        try {
            Long userId = requireUserId(request);
            if (userId == null) {
                return results.error(401, "请先登录");
            }
            return roomService.closeRoom(id, userId);
        } catch (Exception e) {
            e.printStackTrace();
            return results.error("关闭房间失败: " + e.getMessage());
        }
    }

    @GetMapping("/{id}/members")
    public results members(@PathVariable Long id, HttpServletRequest request) {
        try {
            Long userId = requireUserId(request);
            if (userId == null) {
                return results.error(401, "请先登录");
            }
            return roomService.listMembers(id, userId);
        } catch (Exception e) {
            e.printStackTrace();
            return results.error("获取成员失败: " + e.getMessage());
        }
    }

    @GetMapping("/{id}/messages")
    public results messages(@PathVariable Long id,
                            @RequestParam(value = "afterId", required = false, defaultValue = "0") Long afterId,
                            HttpServletRequest request) {
        try {
            Long userId = requireUserId(request);
            if (userId == null) {
                return results.error(401, "请先登录");
            }
            return roomService.listMessages(id, userId, afterId);
        } catch (Exception e) {
            e.printStackTrace();
            return results.error("获取消息失败: " + e.getMessage());
        }
    }

    @PostMapping("/{id}/messages")
    public results postMessage(@PathVariable Long id,
                               @RequestBody Map<String, Object> body,
                               HttpServletRequest request) {
        try {
            Long userId = requireUserId(request);
            if (userId == null) {
                return results.error(401, "请先登录");
            }
            String content = body != null && body.get("content") != null ? String.valueOf(body.get("content")) : null;
            String msgType = null;
            if (body != null && body.get("msgType") != null) {
                msgType = String.valueOf(body.get("msgType"));
            } else if (body != null && body.get("type") != null) {
                msgType = String.valueOf(body.get("type"));
            }
            return roomService.postMessage(id, userId, content, msgType);
        } catch (Exception e) {
            e.printStackTrace();
            return results.error("发送失败: " + e.getMessage());
        }
    }

    private Long requireUserId(HttpServletRequest request) {
        Object attr = request.getAttribute("userId");
        if (attr instanceof Long) {
            return (Long) attr;
        }
        String auth = request.getHeader("Authorization");
        if (auth != null && auth.startsWith("Bearer ")) {
            try {
                String token = auth.substring(7);
                if (jwtUtil.validateToken(token)) {
                    return jwtUtil.getUserIdFromToken(token);
                }
            } catch (Exception ignored) {
            }
        }
        return null;
    }
}
