package com.example.controller;

import com.example.pojo.Tournament;
import com.example.pojo.results;
import com.example.service.AdminUserService;
import com.example.service.TournamentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import java.util.HashMap;
import java.util.Map;

/**
 * 管理端赛事：创建、改状态、生成对阵、录入比分
 */
@RestController
@RequestMapping("/api/admin/tournaments")
@CrossOrigin(origins = "*")
public class TournamentAdminController {

    @Autowired
    private TournamentService tournamentService;

    @Autowired
    private AdminUserService adminUserService;

    private boolean isAdmin(HttpServletRequest request) {
        Long adminId = (Long) request.getAttribute("userId");
        return adminId != null && adminUserService.findById(adminId) != null;
    }

    private Long adminId(HttpServletRequest request) {
        return (Long) request.getAttribute("userId");
    }

    @GetMapping
    public results list(HttpServletRequest request) {
        if (!isAdmin(request)) {
            return results.error(401, "未授权");
        }
        try {
            return results.success("获取成功", tournamentService.listAll());
        } catch (Exception e) {
            e.printStackTrace();
            return results.error("获取失败：" + e.getMessage());
        }
    }

    @GetMapping("/{id}")
    public results detail(@PathVariable Long id, HttpServletRequest request) {
        if (!isAdmin(request)) {
            return results.error(401, "未授权");
        }
        try {
            Map<String, Object> data = tournamentService.getDetail(id, null);
            if (data == null) {
                return results.error("比赛不存在");
            }
            Map<String, Object> bracket = tournamentService.getBracket(id);
            Map<String, Object> out = new HashMap<>(data);
            if (bracket != null) {
                out.put("bracket", bracket);
            }
            return results.success("获取成功", out);
        } catch (Exception e) {
            e.printStackTrace();
            return results.error("获取失败：" + e.getMessage());
        }
    }

    @PostMapping
    public results create(@RequestBody Tournament body, HttpServletRequest request) {
        if (!isAdmin(request)) {
            return results.error(401, "未授权");
        }
        try {
            return tournamentService.create(body, adminId(request));
        } catch (Exception e) {
            e.printStackTrace();
            return results.error("创建失败：" + e.getMessage());
        }
    }

    @PutMapping("/{id}")
    public results update(@PathVariable Long id, @RequestBody Tournament body, HttpServletRequest request) {
        if (!isAdmin(request)) {
            return results.error(401, "未授权");
        }
        try {
            body.setId(id);
            return tournamentService.update(body, adminId(request));
        } catch (Exception e) {
            e.printStackTrace();
            return results.error("更新失败：" + e.getMessage());
        }
    }

    @PutMapping("/{id}/status")
    public results setStatus(@PathVariable Long id, @RequestBody Map<String, String> body, HttpServletRequest request) {
        if (!isAdmin(request)) {
            return results.error(401, "未授权");
        }
        try {
            String status = body != null ? body.get("status") : null;
            return tournamentService.setStatus(id, status, adminId(request));
        } catch (Exception e) {
            e.printStackTrace();
            return results.error("更新状态失败：" + e.getMessage());
        }
    }

    @GetMapping("/{id}/registrations")
    public results registrations(@PathVariable Long id, HttpServletRequest request) {
        if (!isAdmin(request)) {
            return results.error(401, "未授权");
        }
        try {
            return results.success("获取成功", tournamentService.listRegistrations(id));
        } catch (Exception e) {
            e.printStackTrace();
            return results.error("获取报名列表失败：" + e.getMessage());
        }
    }

    @PostMapping("/{id}/generate-bracket")
    public results generateBracket(@PathVariable Long id,
                                   @RequestBody(required = false) Map<String, Object> body,
                                   HttpServletRequest request) {
        if (!isAdmin(request)) {
            return results.error(401, "未授权");
        }
        try {
            boolean shuffle = true;
            if (body != null && body.get("shuffle") != null) {
                shuffle = Boolean.parseBoolean(body.get("shuffle").toString());
            }
            return tournamentService.generateBracket(id, shuffle, adminId(request));
        } catch (Exception e) {
            e.printStackTrace();
            return results.error("生成对阵失败：" + e.getMessage());
        }
    }

    @PutMapping("/matches/{matchId}/result")
    public results enterResult(@PathVariable Long matchId,
                               @RequestBody Map<String, Object> body,
                               HttpServletRequest request) {
        if (!isAdmin(request)) {
            return results.error(401, "未授权");
        }
        try {
            Integer score1 = body.get("score1") != null ? Integer.valueOf(body.get("score1").toString()) : null;
            Integer score2 = body.get("score2") != null ? Integer.valueOf(body.get("score2").toString()) : null;
            return tournamentService.enterResult(matchId, score1, score2, adminId(request));
        } catch (Exception e) {
            e.printStackTrace();
            return results.error("录入比分失败：" + e.getMessage());
        }
    }
}