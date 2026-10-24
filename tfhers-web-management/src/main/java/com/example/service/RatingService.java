package com.example.service;

import com.example.pojo.TournamentMatch;
import com.example.pojo.UserRating;

import java.util.List;
import java.util.Map;

public interface RatingService {
    /** 确保用户有积分行，返回当前积分记录 */
    UserRating ensureRating(Long userId);

    /**
     * 赛事对阵首次录入结果后结算双方积分。
     * 幂等：已 rating_applied 或 history 已有记录则跳过。
     */
    void applyMatchResult(TournamentMatch match);

    List<UserRating> getLeaderboard(int limit);

    /** 含 rating / tier / rank / wins / losses */
    Map<String, Object> getUserRatingView(Long userId);
}