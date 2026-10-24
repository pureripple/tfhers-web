package com.example.service.impl;

import com.example.mapper.TournamentMapper;
import com.example.mapper.TournamentMatchMapper;
import com.example.mapper.TournamentRegistrationMapper;
import com.example.mapper.UserMapper;
import com.example.pojo.Tournament;
import com.example.pojo.TournamentMatch;
import com.example.service.bracket.DoubleElimBracketFactory;
import com.example.pojo.TournamentRegistration;
import com.example.pojo.User;
import com.example.pojo.UserRating;
import com.example.pojo.results;
import com.example.service.RatingService;
import com.example.service.TournamentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class TournamentServiceImpl implements TournamentService {

    private static final List<String> PUBLIC_STATUSES =
            List.of("registration", "closed", "ongoing", "finished");
    private static final List<String> ALL_STATUSES =
            List.of("draft", "registration", "closed", "ongoing", "finished", "cancelled");

    @Autowired
    private TournamentMapper tournamentMapper;
    @Autowired
    private TournamentRegistrationMapper registrationMapper;
    @Autowired
    private TournamentMatchMapper matchMapper;
    @Autowired
    private UserMapper userMapper;
    @Autowired
    private RatingService ratingService;

    @Override
    public List<Tournament> listPublic(Long viewerUserId) {
        List<Tournament> list = tournamentMapper.listPublic();
        if (viewerUserId != null) {
            for (Tournament t : list) {
                TournamentRegistration reg = registrationMapper.findByTournamentAndUser(t.getId(), viewerUserId);
                t.setRegisteredByMe(reg != null && "registered".equals(reg.getStatus()));
            }
        }
        return list;
    }

    @Override
    public List<Tournament> listAll() {
        return tournamentMapper.listAll();
    }

    @Override
    public Map<String, Object> getDetail(Long id, Long viewerUserId) {
        Tournament t = tournamentMapper.findById(id);
        if (t == null) {
            return null;
        }
        if (!PUBLIC_STATUSES.contains(t.getStatus()) && !"draft".equals(t.getStatus())) {
            // cancelled etc still viewable if known id? allow for simplicity
        }
        boolean registered = false;
        boolean checkedInByMe = false;
        TournamentRegistration myReg = null;
        if (viewerUserId != null) {
            myReg = registrationMapper.findByTournamentAndUser(id, viewerUserId);
            registered = myReg != null && "registered".equals(myReg.getStatus());
            checkedInByMe = registered && myReg.isCheckedInYes();
            t.setRegisteredByMe(registered);
        }
        List<TournamentRegistration> regs = registrationMapper.listActiveByTournament(id);
        enrichRegistrationsWithRating(regs);
        int checkedInCount = 0;
        for (TournamentRegistration r : regs) {
            if (r.isCheckedInYes()) {
                checkedInCount++;
            }
        }
        Map<String, Object> data = new HashMap<>();
        data.put("tournament", t);
        data.put("registrations", regs);
        data.put("registeredByMe", registered);
        data.put("checkedInByMe", checkedInByMe);
        data.put("canRegister", canRegister(t, registered, regs.size()));
        data.put("canCheckIn", canPlayerCheckIn(t, myReg));
        data.put("checkedInCount", checkedInCount);
        return data;
    }

    private boolean canRegister(Tournament t, boolean alreadyRegistered, int currentCount) {
        if (alreadyRegistered) return false;
        if (t == null || !"registration".equals(t.getStatus())) return false;
        if (!isWithinRegistrationWindow(t)) return false;
        Integer max = t.getMaxSlots();
        return max == null || currentCount < max;
    }

    /** null 时间字段不额外约束；截止时刻起（含等于）视为不可再报名 */
    private boolean isWithinRegistrationWindow(Tournament t) {
        LocalDateTime now = LocalDateTime.now();
        if (t.getRegistrationOpensAt() != null && now.isBefore(t.getRegistrationOpensAt())) {
            return false;
        }
        if (t.getRegistrationClosesAt() != null && !now.isBefore(t.getRegistrationClosesAt())) {
            return false;
        }
        return true;
    }

    private String registrationWindowRejectReason(Tournament t) {
        LocalDateTime now = LocalDateTime.now();
        if (t.getRegistrationOpensAt() != null && now.isBefore(t.getRegistrationOpensAt())) {
            return "报名尚未开始";
        }
        if (t.getRegistrationClosesAt() != null && !now.isBefore(t.getRegistrationClosesAt())) {
            return "报名已截止";
        }
        return null;
    }


    /**
     * 签到窗口：报名已截止（closed）或比赛进行中（ongoing）时可签到。
     * 若设置了 starts_at，则最早在开赛前 60 分钟开放签到；未设置 starts_at 则 closed/ongoing 期间均可。
     */
    private boolean isCheckInWindowOpen(Tournament t) {
        if (t == null) return false;
        String st = t.getStatus();
        if (!"closed".equals(st) && !"ongoing".equals(st)) {
            return false;
        }
        if (t.getStartsAt() != null) {
            LocalDateTime openFrom = t.getStartsAt().minusMinutes(60);
            if (LocalDateTime.now().isBefore(openFrom)) {
                return false;
            }
        }
        return true;
    }

    private boolean canPlayerCheckIn(Tournament t, TournamentRegistration reg) {
        if (t == null || reg == null || !"registered".equals(reg.getStatus())) {
            return false;
        }
        if (reg.isCheckedInYes()) {
            return false;
        }
        return isCheckInWindowOpen(t);
    }

    private void enrichRegistrationsWithRating(List<TournamentRegistration> regs) {
        if (regs == null) return;
        for (TournamentRegistration r : regs) {
            if (r.getUserId() == null) continue;
            try {
                UserRating ur = ratingService.ensureRating(r.getUserId());
                if (ur != null && ur.getRating() != null) {
                    r.setRating(ur.getRating());
                } else {
                    r.setRating(1000);
                }
            } catch (Exception e) {
                r.setRating(1000);
            }
        }
    }

    @Override
    public Map<String, Object> getBracket(Long id) {
        Tournament t = tournamentMapper.findById(id);
        if (t == null) {
            return null;
        }
        List<TournamentMatch> matches = matchMapper.listByTournament(id);
        int maxSlots = t.getMaxSlots() != null ? t.getMaxSlots() : 16;
        int bracketSlots = resolveBracketSlots(maxSlots, matches);
        int totalRounds = log2(bracketSlots);
        String bracketType = t.getBracketType() == null ? "single" : t.getBracketType();

        for (TournamentMatch m : matches) {
            m.setRoundLabel(sideRoundLabel(m, totalRounds));
        }

        Map<String, Object> data = new HashMap<>();
        data.put("tournament", t);
        data.put("bracketType", bracketType);
        data.put("maxSlots", maxSlots);
        data.put("bracketSlots", bracketSlots);
        data.put("totalRounds", totalRounds);
        data.put("matches", matches);

        if ("double".equalsIgnoreCase(bracketType)) {
            Map<Integer, List<TournamentMatch>> winners = new LinkedHashMap<>();
            Map<Integer, List<TournamentMatch>> losers = new LinkedHashMap<>();
            List<TournamentMatch> grandFinal = new ArrayList<>();
            for (TournamentMatch m : matches) {
                String side = m.getBracketSide() == null ? "winners" : m.getBracketSide();
                if ("winners".equals(side)) {
                    winners.computeIfAbsent(m.getRound(), k -> new ArrayList<>()).add(m);
                } else if ("losers".equals(side)) {
                    losers.computeIfAbsent(m.getRound(), k -> new ArrayList<>()).add(m);
                } else if ("grand_final".equals(side)) {
                    grandFinal.add(m);
                }
            }
            data.put("winners", winners);
            data.put("losers", losers);
            data.put("grandFinal", grandFinal);
            data.put("winnersRoundLabels", buildRoundLabels(totalRounds));
            int lbRounds = losers.isEmpty() ? 0 : losers.keySet().stream().mapToInt(Integer::intValue).max().orElse(0);
            Map<String, String> lbLabels = new LinkedHashMap<>();
            for (int r = 1; r <= lbRounds; r++) {
                lbLabels.put(String.valueOf(r), "败者组第" + r + "轮");
            }
            data.put("losersRoundLabels", lbLabels);
            // flat rounds for admin score list compatibility: all matches by synthetic order
            Map<Integer, List<TournamentMatch>> byRound = new LinkedHashMap<>();
            for (TournamentMatch m : matches) {
                byRound.computeIfAbsent(m.getRound(), k -> new ArrayList<>()).add(m);
            }
            data.put("rounds", byRound);
            data.put("roundLabels", buildRoundLabels(totalRounds));
        } else {
            Map<Integer, List<TournamentMatch>> byRound = new LinkedHashMap<>();
            for (int r = 1; r <= totalRounds; r++) {
                byRound.put(r, new ArrayList<>());
            }
            for (TournamentMatch m : matches) {
                byRound.computeIfAbsent(m.getRound(), k -> new ArrayList<>()).add(m);
            }
            data.put("rounds", byRound);
            data.put("roundLabels", buildRoundLabels(totalRounds));
        }
        return data;
    }

    private static String sideRoundLabel(TournamentMatch m, int wbTotalRounds) {
        String side = m.getBracketSide() == null ? "single" : m.getBracketSide();
        int round = m.getRound() != null ? m.getRound() : 1;
        if ("losers".equals(side)) {
            return "败者组第" + round + "轮";
        }
        if ("grand_final".equals(side)) {
            if (m.getIsResetMatch() != null && m.getIsResetMatch() == 1) {
                return "总决赛重置";
            }
            return "总决赛";
        }
        return roundLabel(round, wbTotalRounds);
    }



    private static Map<String, String> buildRoundLabels(int totalRounds) {
        Map<String, String> map = new LinkedHashMap<>();
        for (int r = 1; r <= totalRounds; r++) {
            map.put(String.valueOf(r), roundLabel(r, totalRounds));
        }
        return map;
    }

    /** round 1 = earliest; totalRounds = final */
    static String roundLabel(int round, int totalRounds) {
        int remaining = 1 << (totalRounds - round + 1); // players still in at start of this round
        if (remaining == 2) return "决赛";
        if (remaining == 4) return "4强";
        if (remaining == 8) return "8强";
        if (remaining == 16) return "16强";
        return remaining + "强";
    }

    private static int log2(int n) {
        int r = 0;
        int v = n;
        while (v > 1) {
            v >>= 1;
            r++;
        }
        return r;
    }

    /** 大于等于 n 的最小 2 的幂（n<=0 时返回 1）。 */
    private static int nextPowerOfTwo(int n) {
        int p = 1;
        while (p < n) {
            p <<= 1;
        }
        return p;
    }

    /** 已有对阵时按首轮场次数还原签表规模，否则用比赛名额。 */
        private static int resolveBracketSlots(int maxSlots, List<TournamentMatch> matches) {
        if (matches == null || matches.isEmpty()) {
            return maxSlots;
        }
        int round1 = 0;
        for (TournamentMatch m : matches) {
            if (m.getRound() == null || m.getRound() != 1) continue;
            String side = m.getBracketSide();
            // Count primary bracket R1 only (ignore losers / GF)
            if (side == null || "single".equals(side) || "winners".equals(side)) {
                round1++;
            }
        }
        if (round1 > 0) {
            return round1 * 2;
        }
        return maxSlots;
    }

    @Override
    @Transactional
    public results register(Long tournamentId, Long userId) {
        Tournament t = tournamentMapper.findById(tournamentId);
        if (t == null) {
            return results.error("比赛不存在");
        }
        if (!"registration".equals(t.getStatus())) {
            return results.error("当前未开放报名");
        }
        String windowReject = registrationWindowRejectReason(t);
        if (windowReject != null) {
            return results.error(windowReject);
        }
        User user = userMapper.findById(userId);
        if (user == null || (user.getStatus() != null && user.getStatus() != 1)) {
            return results.error("用户状态异常，无法报名");
        }
        int count = registrationMapper.countActiveByTournament(tournamentId);
        if (t.getMaxSlots() != null && count >= t.getMaxSlots()) {
            return results.error("报名名额已满");
        }
        TournamentRegistration existing = registrationMapper.findByTournamentAndUser(tournamentId, userId);
        if (existing != null) {
            if ("registered".equals(existing.getStatus())) {
                return results.error("你已报名本场比赛");
            }
            registrationMapper.updateStatus(existing.getId(), "registered");
            return results.success("报名成功", existing);
        }
        TournamentRegistration reg = new TournamentRegistration();
        reg.setTournamentId(tournamentId);
        reg.setUserId(userId);
        reg.setStatus("registered");
        registrationMapper.insert(reg);
        return results.success("报名成功", reg);
    }

    @Override
    @Transactional
    public results withdraw(Long tournamentId, Long userId) {
        Tournament t = tournamentMapper.findById(tournamentId);
        if (t == null) {
            return results.error("比赛不存在");
        }
        if (!"registration".equals(t.getStatus())) {
            return results.error("仅报名阶段可取消报名");
        }
        int n = registrationMapper.withdraw(tournamentId, userId);
        if (n <= 0) {
            return results.error("未找到有效报名记录");
        }
        return results.success("已取消报名", null);
    }

    
    @Override
    @Transactional
    public results checkIn(Long tournamentId, Long userId) {
        return doCheckIn(tournamentId, userId, false);
    }

    @Override
    @Transactional
    public results adminCheckIn(Long tournamentId, Long targetUserId, Long adminId) {
        return doCheckIn(tournamentId, targetUserId, true);
    }

    private results doCheckIn(Long tournamentId, Long userId, boolean adminForce) {
        Tournament t = tournamentMapper.findById(tournamentId);
        if (t == null) {
            return results.error("比赛不存在");
        }
        if (!adminForce && !isCheckInWindowOpen(t)) {
            return results.error("当前不在签到时间（报名截止后，开赛前约 1 小时起可签到）");
        }
        if (adminForce) {
            String st = t.getStatus();
            if ("draft".equals(st) || "registration".equals(st) || "finished".equals(st) || "cancelled".equals(st)) {
                return results.error("当前状态不允许签到");
            }
        }
        TournamentRegistration reg = registrationMapper.findByTournamentAndUser(tournamentId, userId);
        if (reg == null || !"registered".equals(reg.getStatus())) {
            return results.error("未找到有效报名记录");
        }
        if (reg.isCheckedInYes()) {
            return results.success("已签到", reg);
        }
        registrationMapper.markCheckedIn(reg.getId());
        TournamentRegistration updated = registrationMapper.findByTournamentAndUser(tournamentId, userId);
        return results.success("签到成功", updated);
    }

@Override
    @Transactional
    public results create(Tournament tournament, Long adminId) {
        if (tournament.getTitle() == null || tournament.getTitle().trim().isEmpty()) {
            return results.error("请填写比赛名称");
        }
        Integer slots = tournament.getMaxSlots() != null ? tournament.getMaxSlots() : 16;
        if (slots != 8 && slots != 16) {
            return results.error("目前仅支持 8 或 16");
        }
        String bracketType = tournament.getBracketType();
        if (bracketType == null || bracketType.trim().isEmpty()) {
            bracketType = "double";
        }
        bracketType = bracketType.trim().toLowerCase();
        if (!"single".equals(bracketType) && !"double".equals(bracketType)) {
            return results.error("赛制仅支持 single 或 double");
        }
        String status = tournament.getStatus() != null ? tournament.getStatus() : "draft";
        if (!ALL_STATUSES.contains(status)) {
            return results.error("无效状态");
        }
        tournament.setTitle(tournament.getTitle().trim());
        tournament.setMaxSlots(slots);
        tournament.setBracketType(bracketType);
        tournament.setStatus(status);
        tournament.setCreatedBy(adminId);
        tournamentMapper.insert(tournament);
        return results.success("创建成功", tournament);
    }

    @Override
    @Transactional
    public results update(Tournament tournament, Long adminId) {
        if (tournament.getId() == null) {
            return results.error("缺少比赛 ID");
        }
        Tournament existing = tournamentMapper.findById(tournament.getId());
        if (existing == null) {
            return results.error("比赛不存在");
        }
        if (tournament.getMaxSlots() != null && tournament.getMaxSlots() != 8 && tournament.getMaxSlots() != 16) {
            return results.error("名额仅支持 8 或 16");
        }
        if (tournament.getStatus() != null && !ALL_STATUSES.contains(tournament.getStatus())) {
            return results.error("无效状态");
        }
        if (tournament.getTitle() != null) {
            tournament.setTitle(tournament.getTitle().trim());
        }
        
        if (tournament.getBracketType() != null) {
            String bt = tournament.getBracketType().trim().toLowerCase();
            if (!"single".equals(bt) && !"double".equals(bt)) {
                return results.error("赛制仅支持 single 或 double");
            }
            tournament.setBracketType(bt);
        }
tournamentMapper.update(tournament);
        return results.success("更新成功", tournamentMapper.findById(tournament.getId()));
    }

    @Override
    @Transactional
    public results setStatus(Long id, String status, Long adminId) {
        if (status == null || !ALL_STATUSES.contains(status)) {
            return results.error("无效状态");
        }
        Tournament existing = tournamentMapper.findById(id);
        if (existing == null) {
            return results.error("比赛不存在");
        }
        Tournament patch = new Tournament();
        patch.setId(id);
        patch.setStatus(status);
        tournamentMapper.update(patch);
        if ("finished".equals(status)) {
            finalizePlacements(id);
        }
        return results.success("状态已更新", tournamentMapper.findById(id));
    }

    @Override
    public List<TournamentRegistration> listRegistrations(Long tournamentId) {
        List<TournamentRegistration> regs = registrationMapper.listActiveByTournament(tournamentId);
        enrichRegistrationsWithRating(regs);
        return regs;
    }

    @Override
    public List<TournamentRegistration> listMyHistory(Long userId) {
        if (userId == null) {
            return List.of();
        }
        return registrationMapper.listHistoryByUser(userId);
    }

    @Override
    @Transactional
    public results generateBracket(Long tournamentId, boolean shuffle, Long adminId) {
        Tournament t = tournamentMapper.findById(tournamentId);
        if (t == null) {
            return results.error("比赛不存在");
        }
        if ("registration".equals(t.getStatus())) {
            return results.error("请先关闭报名（状态改为「报名截止」）再生成对阵");
        }
        if ("finished".equals(t.getStatus()) || "cancelled".equals(t.getStatus())) {
            return results.error("已结束或已取消的比赛不能重新生成对阵");
        }

        List<TournamentRegistration> allRegs = registrationMapper.listActiveByTournament(tournamentId);
        if (allRegs.isEmpty()) {
            return results.error("暂无报名选手，无法生成对阵");
        }

        // 对阵生成：始终纳入全部已报名选手（不论是否签到）。未到场由主办方事后处理。
        List<TournamentRegistration> regs = allRegs;
        if (regs.size() < 2) {
            return results.error("至少需要 2 名选手才能生成对阵");
        }

        int maxSlots = t.getMaxSlots() != null ? t.getMaxSlots() : 16;
        if (regs.size() > maxSlots) {
            return results.error("报名人数超过签位上限 " + maxSlots
                    + "（当前报名 " + regs.size() + " 人）");
        }
        // 实际签表规模取「大于等于人数的最小 2 的幂」，且不超过名额
        int bracketSize = nextPowerOfTwo(regs.size());
        if (bracketSize > maxSlots) {
            return results.error("报名人数无法装入签位上限 " + maxSlots + "（单败/双败签表）");
        }

        matchMapper.deleteByTournament(tournamentId);
        registrationMapper.clearResultStatsByTournament(tournamentId);

        enrichRegistrationsWithRating(regs);
        List<Long> realPlayers = orderPlayersByEloBuckets(regs, shuffle);

        // 轮空优先配给部分选手（player vs null），避免出现 null vs null
        int byeCount = bracketSize - realPlayers.size();
        List<Long> players = new ArrayList<>(bracketSize);
        int pi = 0;
        for (int i = 0; i < byeCount && pi < realPlayers.size(); i++) {
            players.add(realPlayers.get(pi++));
            players.add(null);
        }
        while (pi < realPlayers.size()) {
            players.add(realPlayers.get(pi++));
        }
        while (players.size() < bracketSize) {
            players.add(null);
        }

        // 写入 seed（按最终签位顺序）
        int seed = 1;
        for (Long uid : players) {
            if (uid == null) continue;
            TournamentRegistration reg = registrationMapper.findByTournamentAndUser(tournamentId, uid);
            if (reg != null) {
                registrationMapper.updateSeed(reg.getId(), seed++);
            }
        }

        String bracketType = t.getBracketType() == null ? "single" : t.getBracketType().trim().toLowerCase();
        if ("double".equals(bracketType)) {
            generateDoubleElimMatches(tournamentId, bracketSize, players);
        } else {
            generateSingleElimMatches(tournamentId, bracketSize, players);
        }

        if (!"ongoing".equals(t.getStatus()) && !"finished".equals(t.getStatus())) {
            Tournament patch = new Tournament();
            patch.setId(tournamentId);
            patch.setStatus("ongoing");
            tournamentMapper.update(patch);
        }

        String msg = "对阵已生成：全部报名 " + regs.size() + " 人（含未签到；Elo 分桶排签）";
        return results.success(msg, getBracket(tournamentId));
    }

    /**
     * Elo 分桶抽签（单败）：
     * 1) 按 rating 降序分成高/中/低三档（不足 3 人则整表视为一档）
     * 2) shuffle=true 时各档内随机；false 时档内保持 rating 降序
     * 3) 轮询合并高→中→低，降低「顶尖过早打萌新」的概率
     */
    private List<Long> orderPlayersByEloBuckets(List<TournamentRegistration> regs, boolean shuffleWithinBucket) {
        List<TournamentRegistration> sorted = new ArrayList<>(regs);
        sorted.sort(Comparator
                .comparing((TournamentRegistration r) -> r.getRating() != null ? r.getRating() : 1000)
                .reversed()
                .thenComparing(r -> r.getUserId() != null ? r.getUserId() : 0L));

        List<List<TournamentRegistration>> buckets = splitIntoRatingBuckets(sorted);
        List<Long> ordered = new ArrayList<>();
        // round-robin merge
        int maxSize = 0;
        for (List<TournamentRegistration> b : buckets) {
            if (shuffleWithinBucket) {
                Collections.shuffle(b);
            }
            if (b.size() > maxSize) maxSize = b.size();
        }
        for (int i = 0; i < maxSize; i++) {
            for (List<TournamentRegistration> b : buckets) {
                if (i < b.size()) {
                    ordered.add(b.get(i).getUserId());
                }
            }
        }
        return ordered;
    }

    /** 高 / 中 / 低三档；人数 < 3 时只返回一档。 */
    private List<List<TournamentRegistration>> splitIntoRatingBuckets(List<TournamentRegistration> sortedDesc) {
        List<List<TournamentRegistration>> buckets = new ArrayList<>();
        int n = sortedDesc.size();
        if (n < 3) {
            buckets.add(new ArrayList<>(sortedDesc));
            return buckets;
        }
        int highEnd = (n + 2) / 3;          // ceil(n/3)
        int midEnd = highEnd + (n / 3);     // approx mid third
        if (midEnd < highEnd) midEnd = highEnd;
        if (midEnd > n) midEnd = n;
        buckets.add(new ArrayList<>(sortedDesc.subList(0, highEnd)));
        buckets.add(new ArrayList<>(sortedDesc.subList(highEnd, midEnd)));
        buckets.add(new ArrayList<>(sortedDesc.subList(midEnd, n)));
        // drop empty
        buckets.removeIf(List::isEmpty);
        return buckets;
    }


    @Override
    @Transactional
    public results enterResult(Long matchId, Integer score1, Integer score2, Long adminId) {
        if (score1 == null || score2 == null) {
            return results.error("请填写双方比分");
        }
        if (score1 < 0 || score2 < 0) {
            return results.error("比分不能为负数");
        }
        if (score1.equals(score2)) {
            return results.error("淘汰赛不能平局，请分出胜负");
        }
        TournamentMatch match = matchMapper.findById(matchId);
        if (match == null) {
            return results.error("对阵不存在");
        }
        Tournament t = tournamentMapper.findById(match.getTournamentId());
        if (t == null) {
            return results.error("比赛不存在");
        }
        if ("finished".equals(t.getStatus()) || "cancelled".equals(t.getStatus())) {
            return results.error("比赛已结束，无法录入");
        }
        if (match.getPlayer1UserId() == null || match.getPlayer2UserId() == null) {
            return results.error("对阵双方未齐，无法录入比分");
        }
        if ("completed".equals(match.getStatus()) || "bye".equals(match.getStatus())) {
            return results.error("该场已有结果，如需改判请联系开发扩展（MVP 暂不支持改判）");
        }

        Long winnerId = score1 > score2 ? match.getPlayer1UserId() : match.getPlayer2UserId();
        match.setScore1(score1);
        match.setScore2(score2);
        match.setWinnerId(winnerId);
        match.setStatus("completed");
        match.setRatingApplied(0);
        matchMapper.update(match);

        // 首次录入结果：按 Elo 更新双方站内积分（幂等，防重复）
        try {
            ratingService.applyMatchResult(match);
        } catch (Exception e) {
            e.printStackTrace();
            // 积分失败不阻断晋级；可事后补结算
        }

        boolean finishedNow = handleAdvanceAfterResult(match, t);

        if (finishedNow) {
            Tournament patch = new Tournament();
            patch.setId(t.getId());
            patch.setStatus("finished");
            tournamentMapper.update(patch);
            finalizePlacements(t.getId());
        } else if (!"ongoing".equals(t.getStatus())) {
            Tournament patch = new Tournament();
            patch.setId(t.getId());
            patch.setStatus("ongoing");
            tournamentMapper.update(patch);
        }

        return results.success("比分已录入", getBracket(t.getId()));
    }


    /**
     * 单败名次结算（写入 tournament_registrations）：
     * - 决赛胜者 = 1，决赛负者 = 2
     * - 更早轮次负者并列名次 = bracketSize / 2^round + 1
     *   （8 人签：首轮负=5，半决赛负=3，决赛负=2）
     * - bye 晋级计 1 胜、0 负；未上场报名者 placement=null，W-L=0（DNP）
     */
    private void finalizePlacements(Long tournamentId) {
        Tournament t = tournamentMapper.findById(tournamentId);
        if (t == null) return;
        List<TournamentMatch> matches = matchMapper.listByTournament(tournamentId);
        List<TournamentRegistration> regs = registrationMapper.listActiveByTournament(tournamentId);
        if (regs.isEmpty()) return;

        String bracketType = t.getBracketType() == null ? "single" : t.getBracketType();
        if ("double".equalsIgnoreCase(bracketType)) {
            finalizePlacementsDouble(tournamentId, matches, regs);
        } else {
            finalizePlacementsSingle(tournamentId, t, matches, regs);
        }
    }

    /** Single-elim placements (P2 behavior). */
    private void finalizePlacementsSingle(Long tournamentId, Tournament t,
                                          List<TournamentMatch> matches,
                                          List<TournamentRegistration> regs) {
        int maxSlots = t.getMaxSlots() != null ? t.getMaxSlots() : 16;
        int bracketSlots = resolveBracketSlots(maxSlots, matches);
        int totalRounds = log2(bracketSlots);

        Map<Long, int[]> wl = new HashMap<>();
        Map<Long, Integer> placement = new HashMap<>();
        for (TournamentMatch m : matches) {
            if (m.getWinnerId() == null) continue;
            if (!"completed".equals(m.getStatus()) && !"bye".equals(m.getStatus())) continue;

            Long winner = m.getWinnerId();
            wl.computeIfAbsent(winner, k -> new int[]{0, 0})[0] += 1;

            Long loser = otherPlayer(m, winner);
            if (loser != null) {
                wl.computeIfAbsent(loser, k -> new int[]{0, 0})[1] += 1;
                int round = m.getRound() != null ? m.getRound() : 1;
                if (round >= totalRounds || m.getNextMatchId() == null) {
                    placement.put(loser, 2);
                    placement.put(winner, 1);
                } else {
                    int shared = (bracketSlots / (1 << round)) + 1;
                    placement.putIfAbsent(loser, shared);
                }
            } else if (m.getNextMatchId() == null) {
                placement.put(winner, 1);
            }
        }

        for (TournamentMatch m : matches) {
            if (m.getNextMatchId() == null && m.getWinnerId() != null
                    && ("completed".equals(m.getStatus()) || "bye".equals(m.getStatus()))) {
                placement.put(m.getWinnerId(), 1);
                Long loser = otherPlayer(m, m.getWinnerId());
                if (loser != null) {
                    placement.put(loser, 2);
                }
            }
        }

        persistPlacementStats(regs, wl, placement);
    }

    /**
     * Double-elim placements:
     * - Ultimate GF winner = 1, GF loser = 2 (GF2 if played, else GF1).
     * - LB final loser = 3.
     * - Other LB losers: shared place by elimination LB round
     *   (earlier exit = worse). Formula: place = 2 + (players still in LB after that round).
     * - WB-only path losses are not placement events (player continues in LB).
     * - W/L counts include all completed/bye matches (WB+LB+GF).
     */
    private void finalizePlacementsDouble(Long tournamentId,
                                          List<TournamentMatch> matches,
                                          List<TournamentRegistration> regs) {
        Map<Long, int[]> wl = new HashMap<>();
        Map<Long, Integer> placement = new HashMap<>();

        int maxLbRound = 0;
        for (TournamentMatch m : matches) {
            if ("losers".equals(m.getBracketSide()) && m.getRound() != null) {
                maxLbRound = Math.max(maxLbRound, m.getRound());
            }
        }

        // W/L from all matches
        for (TournamentMatch m : matches) {
            if (m.getWinnerId() == null) continue;
            if (!"completed".equals(m.getStatus()) && !"bye".equals(m.getStatus())) continue;
            Long winner = m.getWinnerId();
            wl.computeIfAbsent(winner, k -> new int[]{0, 0})[0] += 1;
            Long loser = otherPlayer(m, winner);
            if (loser != null) {
                wl.computeIfAbsent(loser, k -> new int[]{0, 0})[1] += 1;
            }
        }

        // Champion / runner-up from decisive GF (prefer GF2 if completed)
        TournamentMatch gfDeciding = null;
        for (TournamentMatch m : matches) {
            if (!"grand_final".equals(m.getBracketSide())) continue;
            if (!"completed".equals(m.getStatus()) || m.getWinnerId() == null) continue;
            boolean reset = m.getIsResetMatch() != null && m.getIsResetMatch() == 1;
            if (gfDeciding == null) {
                gfDeciding = m;
            } else {
                boolean curReset = gfDeciding.getIsResetMatch() != null && gfDeciding.getIsResetMatch() == 1;
                if (reset && !curReset) {
                    gfDeciding = m;
                }
            }
        }
        if (gfDeciding != null) {
            placement.put(gfDeciding.getWinnerId(), 1);
            Long runner = otherPlayer(gfDeciding, gfDeciding.getWinnerId());
            if (runner != null) {
                placement.put(runner, 2);
            }
        }

        // LB eliminations (loser of LB match is out)
        for (TournamentMatch m : matches) {
            if (!"losers".equals(m.getBracketSide())) continue;
            if (!"completed".equals(m.getStatus()) || m.getWinnerId() == null) continue;
            Long loser = otherPlayer(m, m.getWinnerId());
            if (loser == null) continue;
            int round = m.getRound() != null ? m.getRound() : 1;
            if (round >= maxLbRound) {
                placement.putIfAbsent(loser, 3); // LB final loser
            } else {
                // players remaining in LB after this round ≈ 2^(maxLbRound-round) roughly;
                // shared place = remaining + 1 (plus GF two already ranked separately conceptually)
                int remainingAfter = 1 << Math.max(0, maxLbRound - round);
                int place = remainingAfter + 1;
                // LB final is place 3; before that e.g. remaining 2 → place 3 would collide —
                // use remainingAfter + 2 so LB final losers of earlier rounds get 4,5,...
                if (round < maxLbRound) {
                    place = remainingAfter + 2;
                }
                placement.putIfAbsent(loser, place);
            }
        }

        persistPlacementStats(regs, wl, placement);
    }

    private void persistPlacementStats(List<TournamentRegistration> regs,
                                       Map<Long, int[]> wl,
                                       Map<Long, Integer> placement) {
        for (TournamentRegistration reg : regs) {
            Long uid = reg.getUserId();
            if (uid == null) continue;
            int[] wlv = wl.getOrDefault(uid, new int[]{0, 0});
            Integer place = placement.get(uid);
            registrationMapper.updateResultStats(reg.getId(), place, wlv[0], wlv[1]);
        }
    }




    /** Single-elim tree (existing behavior). bracket_side=single. */
    private void generateSingleElimMatches(Long tournamentId, int bracketSize, List<Long> players) {
        int totalRounds = log2(bracketSize);
        Map<String, Long> idByRoundIndex = new HashMap<>();
        for (int round = 1; round <= totalRounds; round++) {
            int matchesInRound = bracketSize / (1 << round);
            for (int idx = 0; idx < matchesInRound; idx++) {
                TournamentMatch m = new TournamentMatch();
                m.setTournamentId(tournamentId);
                m.setBracketSide("single");
                m.setRound(round);
                m.setMatchIndex(idx);
                m.setIsResetMatch(0);
                m.setStatus("pending");
                if (round == 1) {
                    Long p1 = players.get(idx * 2);
                    Long p2 = players.get(idx * 2 + 1);
                    m.setPlayer1UserId(p1);
                    m.setPlayer2UserId(p2);
                    if (p1 != null && p2 != null) {
                        m.setStatus("ready");
                    } else if (p1 != null || p2 != null) {
                        Long winner = p1 != null ? p1 : p2;
                        m.setWinnerId(winner);
                        m.setScore1(p1 != null ? 1 : 0);
                        m.setScore2(p2 != null ? 1 : 0);
                        m.setStatus("bye");
                    }
                }
                matchMapper.insert(m);
                idByRoundIndex.put(round + "-" + idx, m.getId());
            }
        }
        for (int round = 1; round < totalRounds; round++) {
            int matchesInRound = bracketSize / (1 << round);
            for (int idx = 0; idx < matchesInRound; idx++) {
                Long mid = idByRoundIndex.get(round + "-" + idx);
                int nextIdx = idx / 2;
                int nextSlot = (idx % 2) + 1;
                Long nextId = idByRoundIndex.get((round + 1) + "-" + nextIdx);
                matchMapper.updateNextMatchId(mid, nextId, nextSlot);
            }
        }
        for (int idx = 0; idx < bracketSize / 2; idx++) {
            Long mid = idByRoundIndex.get("1-" + idx);
            TournamentMatch m = matchMapper.findById(mid);
            if (m != null && "bye".equals(m.getStatus()) && m.getWinnerId() != null) {
                advanceFromMatch(m);
            }
        }
    }

    /**
     * Double-elim: winners + losers + grand final (GF1 + GF2 reset shell).
     * Seeds fill winners R1 the same way as single-elim; byes auto-advance.
     */
    private void generateDoubleElimMatches(Long tournamentId, int bracketSize, List<Long> players) {
        List<DoubleElimBracketFactory.Shell> shells = DoubleElimBracketFactory.build(bracketSize);
        Map<String, Long> idByKey = new HashMap<>();

        for (DoubleElimBracketFactory.Shell shell : shells) {
            TournamentMatch m = new TournamentMatch();
            m.setTournamentId(tournamentId);
            m.setBracketSide(shell.bracketSide);
            m.setRound(shell.round);
            m.setMatchIndex(shell.matchIndex);
            m.setIsResetMatch(shell.isResetMatch);
            m.setStatus("pending");
            if ("winners".equals(shell.bracketSide) && shell.round == 1) {
                Long p1 = players.get(shell.matchIndex * 2);
                Long p2 = players.get(shell.matchIndex * 2 + 1);
                m.setPlayer1UserId(p1);
                m.setPlayer2UserId(p2);
                if (p1 != null && p2 != null) {
                    m.setStatus("ready");
                } else if (p1 != null || p2 != null) {
                    Long winner = p1 != null ? p1 : p2;
                    m.setWinnerId(winner);
                    m.setScore1(p1 != null ? 1 : 0);
                    m.setScore2(p2 != null ? 1 : 0);
                    m.setStatus("bye");
                }
            }
            matchMapper.insert(m);
            idByKey.put(shell.key, m.getId());
        }

        for (DoubleElimBracketFactory.Shell shell : shells) {
            Long mid = idByKey.get(shell.key);
            if (shell.winnerNextKey != null) {
                Long nextId = idByKey.get(shell.winnerNextKey);
                matchMapper.updateNextMatchId(mid, nextId, shell.winnerNextSlot);
            }
            if (shell.loserNextKey != null) {
                Long loserNextId = idByKey.get(shell.loserNextKey);
                matchMapper.updateLoserNextMatchId(mid, loserNextId, shell.loserNextSlot);
            }
        }

        // Auto-advance WB R1 byes (winner only; no loser drop)
        for (DoubleElimBracketFactory.Shell shell : shells) {
            if (!"winners".equals(shell.bracketSide) || shell.round != 1) continue;
            TournamentMatch m = matchMapper.findById(idByKey.get(shell.key));
            if (m != null && "bye".equals(m.getStatus()) && m.getWinnerId() != null) {
                advanceFromMatch(m);
            }
        }
    }


    /**
     * After a score is recorded: advance players and decide if tournament is finished.
     * Grand final rules:
     * - GF1 (is_reset_match=0): if player1 (WB champ) wins → finished; if player2 (LB champ) wins → fill GF2 reset.
     * - GF2: winner is champion → finished.
     * - Single-elim / other: finished when nextMatchId is null.
     * @return true if tournament should be marked finished
     */
    private boolean handleAdvanceAfterResult(TournamentMatch match, Tournament t) {
        String side = match.getBracketSide() == null ? "single" : match.getBracketSide();

        if ("grand_final".equals(side)) {
            boolean isReset = match.getIsResetMatch() != null && match.getIsResetMatch() == 1;
            if (!isReset) {
                // GF1: convention player1 = winners champ
                Long wbChamp = match.getPlayer1UserId();
                if (wbChamp != null && wbChamp.equals(match.getWinnerId())) {
                    // WB champ won with 0 losses in GF → done (no reset)
                    return true;
                }
                // LB champ won GF1 → reset: both players into GF2
                if (match.getNextMatchId() != null) {
                    TournamentMatch gf2 = matchMapper.findById(match.getNextMatchId());
                    if (gf2 != null) {
                        gf2.setPlayer1UserId(match.getPlayer1UserId());
                        gf2.setPlayer2UserId(match.getPlayer2UserId());
                        gf2.setStatus("ready");
                        matchMapper.update(gf2);
                    }
                }
                return false;
            }
            // GF2 completed
            return true;
        }

        advanceFromMatch(match);

        // Single-elim final, or DE match with no further winner destination (should not happen except GF)
        if ("single".equals(side) && match.getNextMatchId() == null) {
            return true;
        }
        return false;
    }

    /** Advance winner (and DE loser) into wired next matches. */
    private void advanceFromMatch(TournamentMatch match) {
        if (match.getWinnerId() == null) {
            return;
        }
        // Winner path (skip for GF1 when reset will be decided by enterResult)
        if (match.getNextMatchId() != null && !"grand_final".equals(match.getBracketSide())) {
            placePlayerInMatch(match.getNextMatchId(),
                    match.getNextSlot() != null ? match.getNextSlot() : 1,
                    match.getWinnerId());
        }

        // Loser path (DE winners / not bye-without-opponent)
        Long loserId = otherPlayer(match, match.getWinnerId());
        if (loserId != null && match.getLoserNextMatchId() != null) {
            placePlayerInMatch(match.getLoserNextMatchId(),
                    match.getLoserNextSlot() != null ? match.getLoserNextSlot() : 1,
                    loserId);
        }
    }

    private void placePlayerInMatch(Long matchId, int slot, Long userId) {
        TournamentMatch next = matchMapper.findById(matchId);
        if (next == null || userId == null) {
            return;
        }
        if (slot == 1) {
            next.setPlayer1UserId(userId);
        } else {
            next.setPlayer2UserId(userId);
        }
        if (next.getPlayer1UserId() != null && next.getPlayer2UserId() != null) {
            next.setStatus("ready");
        } else {
            next.setStatus("pending");
        }
        matchMapper.update(next);
    }

    private static Long otherPlayer(TournamentMatch m, Long winnerId) {
        if (m.getPlayer1UserId() != null && !m.getPlayer1UserId().equals(winnerId)) {
            return m.getPlayer1UserId();
        }
        if (m.getPlayer2UserId() != null && !m.getPlayer2UserId().equals(winnerId)) {
            return m.getPlayer2UserId();
        }
        return null;
    }

    /** @deprecated use advanceFromMatch */
    private void advanceWinner(TournamentMatch match) {
        advanceFromMatch(match);
    }

    @Override
    @Transactional
    public int closeExpiredRegistrations() {
        return tournamentMapper.closeExpiredRegistrations();
    }

    @Override
    @Transactional
    public results delete(Long id, Long adminId) {
        Tournament existing = tournamentMapper.findById(id);
        if (existing == null) {
            return results.error("比赛不存在");
        }
        // FK: matches -> registrations -> tournament
        matchMapper.deleteByTournament(id);
        registrationMapper.deleteByTournament(id);
        tournamentMapper.deleteById(id);
        return results.success("比赛已删除", null);
    }

}