package com.example.controller;

import com.example.pojo.Tournament;
import com.example.pojo.results;
import com.example.service.TournamentService;
import com.example.util.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import java.util.Map;

/**
 * 社区端赛事：列表、详情、对阵、报名
 */
@RestController
@RequestMapping("/api/tournaments")
public class TournamentPublicController {

    @Autowired
    private TournamentService tournamentService;

    @Autowired
    private JwtUtil jwtUtil;

    @GetMapping
    public results list(HttpServletRequest request) {
        try {
            Long userId = resolveOptionalUserId(request);
            List<Tournament> list = tournamentService.listPublic(userId);
            return results.success("获取成功", list);
        } catch (Exception e) {
            e.printStackTrace();
            return results.error("获取比赛列表失败：" + e.getMessage());
        }
    }

    /** 当前登录用户的参赛履历（须声明在 /{id} 之前） */
    @GetMapping("/my-history")
    public results myHistory(HttpServletRequest request) {
        try {
            Long userId = (Long) request.getAttribute("userId");
            if (userId == null) {
                userId = resolveOptionalUserId(request);
            }
            if (userId == null) {
                return results.error(401, "请先登录");
            }
            return results.success("获取成功", tournamentService.listMyHistory(userId));
        } catch (Exception e) {
            e.printStackTrace();
            return results.error("获取参赛记录失败：" + e.getMessage());
        }
    }

    @GetMapping("/{id}")
    public results detail(@PathVariable Long id, HttpServletRequest request) {
        try {
            Long userId = resolveOptionalUserId(request);
            Map<String, Object> data = tournamentService.getDetail(id, userId);
            if (data == null) {
                return results.error("比赛不存在");
            }
            return results.success("获取成功", data);
        } catch (Exception e) {
            e.printStackTrace();
            return results.error("获取比赛详情失败：" + e.getMessage());
        }
    }

    @GetMapping("/{id}/bracket")
    public results bracket(@PathVariable Long id) {
        try {
            Map<String, Object> data = tournamentService.getBracket(id);
            if (data == null) {
                return results.error("比赛不存在");
            }
            return results.success("获取成功", data);
        } catch (Exception e) {
            e.printStackTrace();
            return results.error("获取对阵失败：" + e.getMessage());
        }
    }

    @PostMapping("/{id}/register")
    public results register(@PathVariable Long id, HttpServletRequest request) {
        try {
            Long userId = (Long) request.getAttribute("userId");
            if (userId == null) {
                return results.error(401, "请先登录");
            }
            return tournamentService.register(id, userId);
        } catch (Exception e) {
            e.printStackTrace();
            return results.error("报名失败：" + e.getMessage());
        }
    }

    @DeleteMapping("/{id}/register")
    public results withdraw(@PathVariable Long id, HttpServletRequest request) {
        try {
            Long userId = (Long) request.getAttribute("userId");
            if (userId == null) {
                return results.error(401, "请先登录");
            }
            return tournamentService.withdraw(id, userId);
        } catch (Exception e) {
            e.printStackTrace();
            return results.error("取消报名失败：" + e.getMessage());
        }
    }

    @PostMapping("/{id}/check-in")
    public results checkIn(@PathVariable Long id, HttpServletRequest request) {
        try {
            Long userId = (Long) request.getAttribute("userId");
            if (userId == null) {
                return results.error(401, "请先登录");
            }
            return tournamentService.checkIn(id, userId);
        } catch (Exception e) {
            e.printStackTrace();
            return results.error("签到失败：" + e.getMessage());
        }
    }

    private Long resolveOptionalUserId(HttpServletRequest request) {
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