package com.example.controller;

import com.example.pojo.Combo;
import com.example.pojo.results;
import com.example.service.ComboService;
import com.example.util.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import java.util.Map;

/**
 * 用户端提交连段（需登录，提交后状态为待审核）
 */
@RestController
@RequestMapping("/api/combos")
@CrossOrigin(origins = "*")
public class ComboPublicController {

    @Autowired
    private ComboService comboService;

    @Autowired
    private JwtUtil jwtUtil;


    /**
     * 我的连段列表（需登录）
     */

    /**
     * 某用户已通过审核的公开连段（无需登录）
     */
    @GetMapping(value = "/by-user/{userId}", produces = "application/json")
    public results combosByUser(@PathVariable Long userId) {
        if (userId == null || userId <= 0) {
            return results.error(400, "无效的用户 ID");
        }
        List<Combo> list = comboService.listByUserId(userId);
        if (list == null) {
            list = java.util.Collections.emptyList();
        }
        List<Combo> approved = list.stream()
                .filter(c -> c != null && "approved".equalsIgnoreCase(c.getStatus()))
                .toList();
        return results.success("获取成功", approved);
    }

    @GetMapping(value = "/mine", produces = "application/json")
    public results myCombos(HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");
        if (userId == null) {
            return results.error(401, "请先登录");
        }
        List<Combo> list = comboService.listByUserId(userId);
        return results.success("获取我的连段成功", list);
    }

    /**
     * 删除自己的连段（需登录且为创建者）
     */
    @DeleteMapping(value = "/{id}", produces = "application/json")
    public results deleteMyCombo(@PathVariable Long id, HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");
        if (userId == null) {
            return results.error(401, "请先登录");
        }
        boolean ok = comboService.deleteComboByOwner(id, userId);
        if (ok) {
            return results.success("删除成功", null);
        }
        return results.error(403, "只能删除自己提交的连段，或不存在");
    }

    /**
     * 用户发布连段：连段名称、伤害、说明、连段文件URL、连段视频URL
     * 需登录，提交后 status = pending，由管理员审核
     */
    @PostMapping(produces = "application/json", consumes = "application/json")
    public results submitCombo(@RequestHeader(value = "Authorization", required = false) String authHeader,
                               @RequestBody Map<String, Object> body) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return results.error("请先登录");
        }
        try {
            String token = authHeader.substring(7);
            if (!jwtUtil.validateToken(token)) {
                return results.error("登录已过期，请重新登录");
            }
            Long userId = jwtUtil.getUserIdFromToken(token);

            Long characterId = body.get("characterId") != null ? Long.valueOf(body.get("characterId").toString()) : null;
            String title = body.get("title") != null ? String.valueOf(body.get("title")) : null;
            String description = body.get("description") != null ? String.valueOf(body.get("description")) : null;
            Integer damageTotal = body.get("damageTotal") != null ? Integer.valueOf(body.get("damageTotal").toString()) : null;
            String videoUrl = body.get("videoUrl") != null ? String.valueOf(body.get("videoUrl")) : null;
            String comboFileUrl = body.get("comboFileUrl") != null ? String.valueOf(body.get("comboFileUrl")) : null;
            if (description != null && ("null".equals(description) || description.isBlank())) description = null;
            if (comboFileUrl != null && ("null".equals(comboFileUrl) || comboFileUrl.isBlank())) comboFileUrl = null;

            if (characterId == null) {
                return results.error("请选择角色");
            }
            if (title == null || title.trim().isEmpty()) {
                return results.error("连段名称不能为空");
            }
            if (videoUrl == null || videoUrl.trim().isEmpty()) {
                return results.error("连段视频不能为空");
            }

            Combo combo = new Combo();
            combo.setCharacterId(characterId);
            combo.setTitle(title.trim());
            combo.setDescription(description != null ? description.trim() : null);
            combo.setDamageTotal(damageTotal != null ? damageTotal : 0);
            combo.setVideoUrl(videoUrl.trim());
            combo.setComboFileUrl(comboFileUrl);
            combo.setCreatedBy(userId);
            combo.setStatus("pending");

            boolean success = comboService.createCombo(combo);
            if (success) {
                return results.success("提交成功，等待审核", combo);
            } else {
                return results.error("提交失败");
            }
        } catch (Exception e) {
            e.printStackTrace();
            return results.error("提交失败：" + e.getMessage());
        }
    }
}
