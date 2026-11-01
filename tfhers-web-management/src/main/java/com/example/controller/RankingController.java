package com.example.controller;

import com.example.pojo.UserRating;
import com.example.pojo.results;
import com.example.service.RatingService;
import com.example.util.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 站内排位积分排行榜（公开）与个人积分（需登录）
 */
@RestController
public class RankingController {

    @Autowired
    private RatingService ratingService;

    @Autowired
    private JwtUtil jwtUtil;

    /** GET /api/rankings?limit=50 */
    @GetMapping("/api/rankings")
    public results leaderboard(@RequestParam(value = "limit", defaultValue = "50") int limit) {
        try {
            List<UserRating> list = ratingService.getLeaderboard(limit);
            Map<String, Object> data = new HashMap<>();
            data.put("list", list);
            data.put("tiers", Map.of(
                    "D", "<1000",
                    "C", "1000-1199",
                    "B", "1200-1399",
                    "A", "1400-1599",
                    "S", "1600+"
            ));
            data.put("description", "站内 Elo 积分由赛事对阵录入驱动；起始 1000 分，段位 D→S");
            return results.success("获取成功", data);
        } catch (Exception e) {
            e.printStackTrace();
            return results.error("获取排行榜失败: " + e.getMessage());
        }
    }

    /** GET /api/user/rating — 当前登录用户的积分、段位、站内排名 */
    @GetMapping("/api/user/rating")
    public results myRating(HttpServletRequest request) {
        try {
            Long userId = (Long) request.getAttribute("userId");
            if (userId == null) {
                String auth = request.getHeader("Authorization");
                if (auth != null && auth.startsWith("Bearer ")) {
                    String token = auth.substring(7);
                    if (jwtUtil.validateToken(token)) {
                        userId = jwtUtil.getUserIdFromToken(token);
                    }
                }
            }
            if (userId == null) {
                return results.error(401, "请先登录");
            }
            return results.success("获取成功", ratingService.getUserRatingView(userId));
        } catch (Exception e) {
            e.printStackTrace();
            return results.error("获取积分失败: " + e.getMessage());
        }
    }
}