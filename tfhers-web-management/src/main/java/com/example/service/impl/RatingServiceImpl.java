package com.example.service.impl;

import com.example.mapper.RatingHistoryMapper;
import com.example.mapper.TournamentMatchMapper;
import com.example.mapper.UserRatingMapper;
import com.example.pojo.RatingHistory;
import com.example.pojo.TournamentMatch;
import com.example.pojo.UserRating;
import com.example.service.RatingService;
import com.example.util.EloUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class RatingServiceImpl implements RatingService {

    @Autowired
    private UserRatingMapper userRatingMapper;
    @Autowired
    private RatingHistoryMapper ratingHistoryMapper;
    @Autowired
    private TournamentMatchMapper matchMapper;

    @Override
    @Transactional
    public UserRating ensureRating(Long userId) {
        if (userId == null) {
            return null;
        }
        UserRating existing = userRatingMapper.findByUserId(userId);
        if (existing != null) {
            return existing;
        }
        userRatingMapper.insertDefault(userId, EloUtil.DEFAULT_RATING);
        return userRatingMapper.findByUserId(userId);
    }

    @Override
    @Transactional
    public void applyMatchResult(TournamentMatch match) {
        if (match == null || match.getId() == null) {
            return;
        }
        // 重新读库，用到最新 rating_applied / 双方 ID / 比分
        TournamentMatch fresh = matchMapper.findById(match.getId());
        if (fresh == null) {
            return;
        }
        if (fresh.getRatingApplied() != null && fresh.getRatingApplied() == 1) {
            return; // 已结算，不重复
        }
        // 只结算正式完成的对阵；轮空 bye、空位、未开打一律不加不减
        if (!"completed".equals(fresh.getStatus())) {
            return;
        }
        Long p1 = fresh.getPlayer1UserId();
        Long p2 = fresh.getPlayer2UserId();
        Long winnerId = fresh.getWinnerId();
        // 对手为空（轮空 / 空签）：双方都不进行加减分
        if (p1 == null || p2 == null || winnerId == null) {
            return;
        }
        if (ratingHistoryMapper.countByMatch(fresh.getId()) > 0) {
            // history 已有 → 标记后返回
            fresh.setRatingApplied(1);
            matchMapper.update(fresh);
            return;
        }

        UserRating r1 = ensureRating(p1);
        UserRating r2 = ensureRating(p2);
        int rating1 = r1.getRating() != null ? r1.getRating() : EloUtil.DEFAULT_RATING;
        int rating2 = r2.getRating() != null ? r2.getRating() : EloUtil.DEFAULT_RATING;

        boolean p1Won = winnerId.equals(p1);
        Integer s1 = fresh.getScore1();
        Integer s2 = fresh.getScore2();
        // 段位差距 Elo + 比分细调（2-0 / 2-1 等局分占比）
        int new1 = EloUtil.computeNewRating(rating1, rating2, p1Won, s1, s2);
        int new2 = EloUtil.computeNewRating(rating2, rating1, !p1Won, s2, s1);

        writeSide(p1, fresh, rating1, new1, p2, rating2, p1Won);
        writeSide(p2, fresh, rating2, new2, p1, rating1, !p1Won);

        fresh.setRatingApplied(1);
        matchMapper.update(fresh);
    }

    private void writeSide(Long userId, TournamentMatch match,
                           int before, int after,
                           Long opponentId, int opponentRating, boolean won) {
        if (ratingHistoryMapper.countByUserAndMatch(userId, match.getId()) > 0) {
            return;
        }
        RatingHistory h = new RatingHistory();
        h.setUserId(userId);
        h.setMatchId(match.getId());
        h.setTournamentId(match.getTournamentId());
        h.setRatingBefore(before);
        h.setRatingAfter(after);
        h.setDelta(EloUtil.delta(before, after));
        h.setOpponentId(opponentId);
        h.setOpponentRating(opponentRating);
        h.setResult(won ? 1 : 0);
        ratingHistoryMapper.insert(h);

        userRatingMapper.updateRating(userId, after, won ? 1 : 0, won ? 0 : 1);
    }

    @Override
    public List<UserRating> getLeaderboard(int limit) {
        int lim = limit <= 0 ? 50 : Math.min(limit, 200);
        List<UserRating> list = userRatingMapper.listLeaderboard(lim);
        int rank = 1;
        for (UserRating ur : list) {
            ur.setTier(EloUtil.tierOf(ur.getRating() != null ? ur.getRating() : EloUtil.DEFAULT_RATING));
            ur.setRank(rank++);
        }
        return list;
    }

    @Override
    public Map<String, Object> getUserRatingView(Long userId) {
        Map<String, Object> view = new HashMap<>();
        if (userId == null) {
            view.put("rating", EloUtil.DEFAULT_RATING);
            view.put("tier", EloUtil.tierOf(EloUtil.DEFAULT_RATING));
            view.put("tierLabel", EloUtil.tierLabel(EloUtil.tierOf(EloUtil.DEFAULT_RATING)));
            view.put("rank", null);
            view.put("matchesPlayed", 0);
            view.put("wins", 0);
            view.put("losses", 0);
            return view;
        }
        UserRating ur = ensureRating(userId);
        int rating = ur != null && ur.getRating() != null ? ur.getRating() : EloUtil.DEFAULT_RATING;
        String tier = EloUtil.tierOf(rating);
        Integer rank = userRatingMapper.countRank(userId, rating);
        view.put("userId", userId);
        view.put("rating", rating);
        view.put("tier", tier);
        view.put("tierLabel", EloUtil.tierLabel(tier));
        view.put("rank", rank);
        view.put("matchesPlayed", ur != null ? ur.getMatchesPlayed() : 0);
        view.put("wins", ur != null ? ur.getWins() : 0);
        view.put("losses", ur != null ? ur.getLosses() : 0);
        return view;
    }
}
