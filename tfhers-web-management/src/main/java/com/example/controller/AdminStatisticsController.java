package com.example.controller;

import com.example.mapper.GameAchievementSchemaMapper;
import com.example.mapper.UserMapper;
import com.example.pojo.GameAchievementSchema;
import com.example.pojo.User;
import com.example.pojo.results;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * 管理端：运营数据统计（需登录，走 /api/admin/*）
 */
@RestController
@RequestMapping("/api/admin/statistics")
@CrossOrigin(origins = "*")
public class AdminStatisticsController {

    private static final ObjectMapper JSON = new ObjectMapper();
    private static final TypeReference<List<Map<String, Object>>> ACHV_JSON_LIST =
            new TypeReference<>() {};

    @Autowired
    private UserMapper userMapper;

    @Autowired
    private GameAchievementSchemaMapper gameAchievementSchemaMapper;

    @Value("${steam.app-id:0}")
    private long steamAppId;

    /** 0–2000 小时按每 200 小时一段，最后一段为 ≥2000 小时 */
    private static final String[] HISTOGRAM_LABELS = {
            "0–200 小时",
            "200–400 小时",
            "400–600 小时",
            "600–800 小时",
            "800–1000 小时",
            "1000–1200 小时",
            "1200–1400 小时",
            "1400–1600 小时",
            "1600–1800 小时",
            "1800–2000 小时",
            "≥2000 小时"
    };

    private static final String[] HISTOGRAM_KEYS = {
            "seg0", "seg1", "seg2", "seg3", "seg4", "seg5", "seg6", "seg7", "seg8", "seg9", "seg10"
    };

    /**
     * Steam 游戏时长：Top10 + 时长分段人数（直方图数据）
     */
    @GetMapping("/steam-playtime")
    public results steamPlaytimeOverview() {
        try {
            List<User> topUsers = userMapper.selectSteamPlaytimeTopUsers(10);
            List<Map<String, Object>> top10 = new ArrayList<>();
            for (User u : topUsers) {
                if (u == null) continue;
                int minutes = u.getSteamPlaytimeMinutes() != null ? u.getSteamPlaytimeMinutes() : 0;
                double hours = Math.round((minutes / 60.0) * 10) / 10.0;
                Map<String, Object> row = new HashMap<>();
                row.put("userId", u.getId());
                row.put("displayName", displayName(u));
                row.put("username", u.getUsername());
                row.put("steamId", u.getSteamId());
                row.put("playtimeMinutes", minutes);
                row.put("playtimeHours", hours);
                top10.add(row);
            }

            Map<String, Object> histRow = userMapper.selectSteamPlaytimeHistogramRow();
            List<Map<String, Object>> histogram = new ArrayList<>();
            if (histRow != null) {
                for (int i = 0; i < HISTOGRAM_LABELS.length; i++) {
                    long c = readCount(histRow, HISTOGRAM_KEYS[i]);
                    Map<String, Object> b = new HashMap<>();
                    b.put("label", HISTOGRAM_LABELS[i]);
                    b.put("count", c);
                    histogram.add(b);
                }
            }

            Map<String, Object> data = new HashMap<>();
            data.put("top10", top10);
            data.put("histogram", histogram);
            return results.success("ok", data);
        } catch (Exception e) {
            e.printStackTrace();
            return results.error("获取 Steam 时长统计失败：" + e.getMessage());
        }
    }

    /**
     * 本站成就解锁占比：分母为「已绑定 Steam、账号正常且本地有成就缓存」的用户数；
     * 分子为其中 JSON 已解锁列表包含该 apiName 的人数。与 Steam 全球统计无关。
     */
    @GetMapping("/steam-achievements-site")
    public results steamAchievementsSiteUnlockRates() {
        try {
            if (steamAppId <= 0) {
                return results.error("未配置 steam.app-id");
            }
            List<String> jsonRows = userMapper.selectSteamAchievementJsonForSiteStats();
            int sampleSize = 0;
            Map<String, Integer> unlockCounts = new HashMap<>();
            for (String raw : jsonRows) {
                if (raw == null || raw.isBlank()) {
                    continue;
                }
                List<Map<String, Object>> items;
                try {
                    items = JSON.readValue(raw.trim(), ACHV_JSON_LIST);
                } catch (Exception ex) {
                    continue;
                }
                if (items == null) {
                    continue;
                }
                sampleSize++;
                Set<String> seen = new HashSet<>();
                for (Map<String, Object> item : items) {
                    if (item == null) {
                        continue;
                    }
                    Object api = item.get("apiName");
                    if (api == null) {
                        continue;
                    }
                    String apiName = api.toString();
                    if (apiName.isEmpty() || !seen.add(apiName)) {
                        continue;
                    }
                    unlockCounts.merge(apiName, 1, Integer::sum);
                }
            }

            List<GameAchievementSchema> schemaRows = gameAchievementSchemaMapper.selectByAppId(steamAppId);
            List<Map<String, Object>> achievements = new ArrayList<>();
            Set<String> listed = new HashSet<>();

            for (GameAchievementSchema row : schemaRows) {
                if (row == null || row.getApiName() == null) {
                    continue;
                }
                String apiName = row.getApiName();
                listed.add(apiName);
                int unlocked = unlockCounts.getOrDefault(apiName, 0);
                achievements.add(achievementSiteRow(sampleSize, apiName, row.getDisplayName(), unlocked));
            }

            for (Map.Entry<String, Integer> e : unlockCounts.entrySet()) {
                if (listed.contains(e.getKey())) {
                    continue;
                }
                achievements.add(achievementSiteRow(sampleSize, e.getKey(), null, e.getValue()));
            }

            achievements.sort(Comparator
                    .comparingDouble((Map<String, Object> m) -> (Double) m.get("rate"))
                    .thenComparing(m -> String.valueOf(m.get("apiName"))));

            Map<String, Object> data = new HashMap<>();
            data.put("appId", steamAppId);
            data.put("sampleSize", sampleSize);
            data.put("note", "分母为已绑定 Steam、状态正常且本地存在成就缓存的用户；未拉取过成就的用户不计入。");
            data.put("achievements", achievements);
            return results.success("ok", data);
        } catch (Exception e) {
            e.printStackTrace();
            return results.error("获取本站成就解锁统计失败：" + e.getMessage());
        }
    }

    private static Map<String, Object> achievementSiteRow(int sampleSize, String apiName,
                                                          String displayName, int unlockedCount) {
        Map<String, Object> row = new HashMap<>();
        row.put("apiName", apiName);
        row.put("displayName", displayName);
        row.put("unlockedCount", unlockedCount);
        double rate = sampleSize > 0 ? (unlockedCount / (double) sampleSize) : 0.0;
        row.put("rate", Math.round(rate * 10000) / 10000.0);
        row.put("ratePercent", Math.round(rate * 10000) / 100.0);
        return row;
    }

    private static String displayName(User u) {
        if (u.getSteamPersonaName() != null && !u.getSteamPersonaName().isBlank()) {
            return u.getSteamPersonaName();
        }
        if (u.getNickname() != null && !u.getNickname().isBlank()) {
            return u.getNickname();
        }
        if (u.getUsername() != null && !u.getUsername().isBlank()) {
            return u.getUsername();
        }
        return "用户 " + u.getId();
    }

    private static long readCount(Map<String, Object> row, String key) {
        Object v = row.get(key);
        if (v == null) {
            for (Map.Entry<String, Object> e : row.entrySet()) {
                if (e.getKey() != null && e.getKey().equalsIgnoreCase(key)) {
                    v = e.getValue();
                    break;
                }
            }
        }
        if (v == null) return 0L;
        if (v instanceof Number) return ((Number) v).longValue();
        try {
            return Long.parseLong(v.toString());
        } catch (NumberFormatException ex) {
            return 0L;
        }
    }
}
