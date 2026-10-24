package com.example.service.impl;

import com.example.mapper.TournamentMapper;
import com.example.mapper.TournamentMatchMapper;
import com.example.mapper.TournamentRegistrationMapper;
import com.example.mapper.UserMapper;
import com.example.pojo.Tournament;
import com.example.pojo.TournamentMatch;
import com.example.pojo.TournamentRegistration;
import com.example.pojo.User;
import com.example.pojo.results;
import com.example.service.RatingService;
import com.example.service.TournamentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collections;
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
        if (viewerUserId != null) {
            TournamentRegistration reg = registrationMapper.findByTournamentAndUser(id, viewerUserId);
            registered = reg != null && "registered".equals(reg.getStatus());
            t.setRegisteredByMe(registered);
        }
        List<TournamentRegistration> regs = registrationMapper.listActiveByTournament(id);
        Map<String, Object> data = new HashMap<>();
        data.put("tournament", t);
        data.put("registrations", regs);
        data.put("registeredByMe", registered);
        data.put("canRegister", canRegister(t, registered, regs.size()));
        return data;
    }

    private boolean canRegister(Tournament t, boolean alreadyRegistered, int currentCount) {
        if (alreadyRegistered) return false;
        if (t == null || !"registration".equals(t.getStatus())) return false;
        Integer max = t.getMaxSlots();
        return max == null || currentCount < max;
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
        for (TournamentMatch m : matches) {
            m.setRoundLabel(roundLabel(m.getRound(), totalRounds));
        }
        Map<Integer, List<TournamentMatch>> byRound = new LinkedHashMap<>();
        for (int r = 1; r <= totalRounds; r++) {
            byRound.put(r, new ArrayList<>());
        }
        for (TournamentMatch m : matches) {
            byRound.computeIfAbsent(m.getRound(), k -> new ArrayList<>()).add(m);
        }
        Map<String, Object> data = new HashMap<>();
        data.put("tournament", t);
        data.put("maxSlots", maxSlots);
        data.put("bracketSlots", bracketSlots);
        data.put("totalRounds", totalRounds);
        data.put("roundLabels", buildRoundLabels(totalRounds));
        data.put("matches", matches);
        data.put("rounds", byRound);
        return data;
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
            if (m.getRound() != null && m.getRound() == 1) {
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
    public results create(Tournament tournament, Long adminId) {
        if (tournament.getTitle() == null || tournament.getTitle().trim().isEmpty()) {
            return results.error("请填写比赛名称");
        }
        Integer slots = tournament.getMaxSlots() != null ? tournament.getMaxSlots() : 16;
        if (slots != 8 && slots != 16) {
            return results.error("名额仅支持 8 或 16");
        }
        String status = tournament.getStatus() != null ? tournament.getStatus() : "draft";
        if (!ALL_STATUSES.contains(status)) {
            return results.error("无效状态");
        }
        tournament.setTitle(tournament.getTitle().trim());
        tournament.setMaxSlots(slots);
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
        return results.success("状态已更新", tournamentMapper.findById(id));
    }

    @Override
    public List<TournamentRegistration> listRegistrations(Long tournamentId) {
        return registrationMapper.listActiveByTournament(tournamentId);
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
        List<TournamentRegistration> regs = registrationMapper.listActiveByTournament(tournamentId);
        if (regs.isEmpty()) {
            return results.error("暂无报名选手，无法生成对阵");
        }
        if (regs.size() < 2) {
            return results.error("至少需要2名选手才能生成对阵");
        }
        int maxSlots = t.getMaxSlots() != null ? t.getMaxSlots() : 16;
        if (regs.size() > maxSlots) {
            return results.error("报名人数超过名额 " + maxSlots);
        }
        // 实际签表规模取「大于等于报名人数的最小 2 的幂」，且不超过名额。
        // 避免名额 16、仅 7 人报名时按 16 签强塞轮空导致越界/空对空卡死。
        int bracketSize = nextPowerOfTwo(regs.size());
        if (bracketSize > maxSlots) {
            return results.error("报名人数无法放入名额 " + maxSlots + " 的淘汰签表");
        }

        // 清空旧对阵
        matchMapper.deleteByTournament(tournamentId);

        List<Long> realPlayers = new ArrayList<>();
        for (TournamentRegistration r : regs) {
            realPlayers.add(r.getUserId());
        }
        if (shuffle) {
            Collections.shuffle(realPlayers);
        }
        // 轮空优先配给部分选手（player vs null），避免出现 null vs null
        int byeCount = bracketSize - realPlayers.size();
        List<Long> players = new ArrayList<>(bracketSize);
        int pi = 0;
        // byeCount 在「2 的幂签表」下必 < 选手数；仍加 pi 守卫防止名额远大于人数时越界
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

        // 写入 seed
        int seed = 1;
        for (Long uid : players) {
            if (uid == null) continue;
            TournamentRegistration reg = registrationMapper.findByTournamentAndUser(tournamentId, uid);
            if (reg != null) {
                registrationMapper.updateSeed(reg.getId(), seed++);
            }
        }

        int totalRounds = log2(bracketSize);
        // 先创建所有轮次空场次（从决赛往前也可以，这里按轮次创建）
        Map<String, Long> idByRoundIndex = new HashMap<>(); // key = round-index
        for (int round = 1; round <= totalRounds; round++) {
            int matchesInRound = bracketSize / (1 << round);
            for (int idx = 0; idx < matchesInRound; idx++) {
                TournamentMatch m = new TournamentMatch();
                m.setTournamentId(tournamentId);
                m.setRound(round);
                m.setMatchIndex(idx);
                m.setStatus("pending");
                if (round == 1) {
                    Long p1 = players.get(idx * 2);
                    Long p2 = players.get(idx * 2 + 1);
                    m.setPlayer1UserId(p1);
                    m.setPlayer2UserId(p2);
                    if (p1 != null && p2 != null) {
                        m.setStatus("ready");
                    } else if (p1 != null || p2 != null) {
                        // 轮空
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

        // 链接 next_match
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

        // 处理首轮 bye 晋级
        List<TournamentMatch> round1 = new ArrayList<>();
        for (int idx = 0; idx < bracketSize / 2; idx++) {
            Long mid = idByRoundIndex.get("1-" + idx);
            TournamentMatch m = matchMapper.findById(mid);
            if (m != null && "bye".equals(m.getStatus()) && m.getWinnerId() != null) {
                advanceWinner(m);
            }
            round1.add(m);
        }

        // 若已有对阵则进入进行中（除非已是 finished）
        if (!"ongoing".equals(t.getStatus()) && !"finished".equals(t.getStatus())) {
            Tournament patch = new Tournament();
            patch.setId(tournamentId);
            patch.setStatus("ongoing");
            tournamentMapper.update(patch);
        }

        return results.success("对阵已生成", getBracket(tournamentId));
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

        advanceWinner(match);

        // 决赛结束 -> finished（决赛场无 nextMatchId；勿用名额推算轮次，以免实际签表小于名额时永不完赛）
        if (match.getNextMatchId() == null) {
            Tournament patch = new Tournament();
            patch.setId(t.getId());
            patch.setStatus("finished");
            tournamentMapper.update(patch);
        } else if (!"ongoing".equals(t.getStatus())) {
            Tournament patch = new Tournament();
            patch.setId(t.getId());
            patch.setStatus("ongoing");
            tournamentMapper.update(patch);
        }

        return results.success("比分已录入", getBracket(t.getId()));
    }

    private void advanceWinner(TournamentMatch match) {
        if (match.getNextMatchId() == null || match.getWinnerId() == null) {
            return;
        }
        TournamentMatch next = matchMapper.findById(match.getNextMatchId());
        if (next == null) {
            return;
        }
        int slot = match.getNextSlot() != null ? match.getNextSlot() : 1;
        if (slot == 1) {
            next.setPlayer1UserId(match.getWinnerId());
        } else {
            next.setPlayer2UserId(match.getWinnerId());
        }
        if (next.getPlayer1UserId() != null && next.getPlayer2UserId() != null) {
            next.setStatus("ready");
        } else {
            next.setStatus("pending");
        }
        matchMapper.update(next);
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