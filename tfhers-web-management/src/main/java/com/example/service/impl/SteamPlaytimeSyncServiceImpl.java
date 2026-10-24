package com.example.service.impl;

import com.example.mapper.SteamPlaytimeHistoryMapper;
import com.example.mapper.UserMapper;
import com.example.pojo.SteamPlaytimeHistory;
import com.example.pojo.User;
import com.example.pojo.results;
import com.example.service.SteamPlaytimeSyncService;
import com.example.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;

@Service
public class SteamPlaytimeSyncServiceImpl implements SteamPlaytimeSyncService {

    @Autowired
    private UserMapper userMapper;

    @Autowired
    private UserService userService;

    @Autowired
    private SteamPlaytimeHistoryMapper steamPlaytimeHistoryMapper;

    @Value("${steam.api-key}")
    private String steamApiKey;

    @Value("${steam.app-id}")
    private Long steamAppId;

    @Value("${steam.playtime-sync.max-per-run:50}")
    private int maxPerRun;

    @Value("${steam.playtime-sync.min-updated-hours:24}")
    private long minUpdatedHours;

    @Value("${steam.playtime-sync.log-path:logs/steam-playtime-sync.log}")
    private String logPath;

    private final RestTemplate restTemplate = new RestTemplate();

    private final AtomicBoolean running = new AtomicBoolean(false);

    @Override
    public void syncBoundUsersPlaytime() {
        if (!running.compareAndSet(false, true)) {
            return; // 上一次同步还没结束
        }

        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
        long startEpochMs = System.currentTimeMillis();
        int successCount = 0;
        int failCount = 0;
        int skipCount = 0;
        StringBuilder logSb = new StringBuilder();
        logSb.append("\n=== SteamPlaytimeSync START ")
                .append(fmt.format(LocalDateTime.now()))
                .append(" ===\n");
        logSb.append("pid? n/a; runtimeMs=").append(0).append("\n");

        try {
            LocalDateTime updatedBefore = LocalDateTime.now().minusHours(minUpdatedHours);
            List<User> users = userMapper.findSteamUsersToSync(maxPerRun, updatedBefore);
            if (users == null || users.isEmpty()) {
                logSb.append("No users to sync. updatedBefore=").append(fmt.format(updatedBefore)).append("\n");
                writeLog(logSb);
                return;
            }

            // 为了日志可读性：按 userId 排序
            users.sort(Comparator.comparingLong(User::getId));
            logSb.append("updatedBefore=").append(fmt.format(updatedBefore))
                    .append(", selectedUsersCount=").append(users.size()).append("\n");

            for (User user : users) {
                if (user == null || user.getId() == null || user.getSteamId() == null) continue;

                boolean ok = true;
                Long steamId = user.getSteamId();
                Long playtimeMinutes = null;
                try {
                    playtimeMinutes = fetchPlaytimeMinutes(steamId);
                } catch (Exception e) {
                    // 取时长失败：不更新用户，避免把 0 写回缓存污染统计
                    System.out.println("[SteamPlaytimeSync] fetchPlaytimeMinutes failed userId=" + user.getId()
                            + " steamId=" + steamId + " msg=" + e.getMessage());
                    failCount++;
                    logSb.append("USER userId=").append(user.getId())
                            .append(" steamId=").append(steamId)
                            .append(" FAIL fetchPlaytime msg=").append(safeLogValue(e.getMessage()))
                            .append("\n");
                    ok = false;
                }

                if (playtimeMinutes == null) {
                    if (ok) {
                        failCount++;
                        logSb.append("USER userId=").append(user.getId())
                                .append(" steamId=").append(steamId)
                                .append(" FAIL fetchPlaytime nullMinutes")
                                .append("\n");
                        ok = false;
                    }
                    continue;
                }

                // 只允许递增写入：Steam 小于库里缓存时，不更新 users、不写历史快照
                Integer dbMinutes = user.getSteamPlaytimeMinutes();
                if (dbMinutes != null && playtimeMinutes < dbMinutes.longValue()) {
                    skipCount++;
                    logSb.append("USER userId=").append(user.getId())
                            .append(" steamId=").append(steamId)
                            .append(" SKIP decrease steamMinutes=").append(playtimeMinutes)
                            .append(" dbMinutes=").append(dbMinutes)
                            .append("\n");
                    continue;
                }

                Map<String, String> profile = null;
                try {
                    profile = fetchSteamProfile(steamId);
                } catch (Exception ignored) {
                    // 头像/昵称失败不影响时长缓存
                }

                LocalDateTime now = LocalDateTime.now();

                // 写回 users 缓存字段
                User toUpdate = new User();
                toUpdate.setId(user.getId());
                toUpdate.setSteamPlaytimeMinutes(playtimeMinutes.intValue());
                toUpdate.setSteamPlaytimeUpdatedAt(now);
                if (profile != null) {
                    toUpdate.setSteamPersonaName(profile.get("personaName"));
                    toUpdate.setSteamAvatarUrl(profile.get("avatarUrl"));
                }
                try {
                    results updateRes = userService.updateUser(toUpdate);
                    if (updateRes == null || updateRes.getCode() != 200) {
                        System.out.println("[SteamPlaytimeSync] updateUser failed userId=" + user.getId()
                                + " code=" + (updateRes != null ? updateRes.getCode() : "null")
                                + " msg=" + (updateRes != null ? updateRes.getMsg() : "null"));
                        failCount++;
                        logSb.append("USER userId=").append(user.getId())
                                .append(" steamId=").append(steamId)
                                .append(" FAIL updateUser code=")
                                .append(updateRes != null ? updateRes.getCode() : "null")
                                .append(" msg=").append(safeLogValue(updateRes != null ? updateRes.getMsg() : null))
                                .append(" minutes=").append(playtimeMinutes)
                                .append("\n");
                        // 不直接 continue：仍尝试写历史快照，尽量保留数据
                        ok = false;
                    }
                } catch (Exception e) {
                    // 更新失败仍继续写历史（可在下次同步修复），避免丢快照
                    System.out.println("[SteamPlaytimeSync] updateUser exception userId=" + user.getId()
                            + " msg=" + e.getMessage());
                    failCount++;
                    logSb.append("USER userId=").append(user.getId())
                            .append(" steamId=").append(steamId)
                            .append(" FAIL updateUser exception msg=").append(safeLogValue(e.getMessage()))
                            .append(" minutes=").append(playtimeMinutes)
                            .append("\n");
                    ok = false;
                }

                // 写入历史快照：用于“两周内增量”计算
                try {
                    SteamPlaytimeHistory history = new SteamPlaytimeHistory();
                    history.setUserId(user.getId());
                    history.setSteamId(steamId);
                    history.setPlaytimeMinutes(playtimeMinutes.intValue());
                    steamPlaytimeHistoryMapper.insert(history);
                } catch (Exception e) {
                    System.out.println("[SteamPlaytimeSync] insert history failed userId=" + user.getId()
                            + " msg=" + e.getMessage());
                    failCount++;
                    logSb.append("USER userId=").append(user.getId())
                            .append(" steamId=").append(steamId)
                            .append(" FAIL insertHistory msg=").append(safeLogValue(e.getMessage()))
                            .append("\n");
                    ok = false;
                }
                if (ok) {
                    successCount++;
                    logSb.append("USER userId=").append(user.getId())
                            .append(" steamId=").append(steamId)
                            .append(" OK minutes=").append(playtimeMinutes)
                            .append("\n");
                }
            }

            long costMs = System.currentTimeMillis() - startEpochMs;
            logSb.append("=== SteamPlaytimeSync END ")
                    .append(fmt.format(LocalDateTime.now()))
                    .append(" runtimeMs=").append(costMs)
                    .append(" successCount=").append(successCount)
                    .append(" failCount=").append(failCount)
                    .append(" skipCount=").append(skipCount)
                    .append(" ===\n");
            writeLog(logSb);
        } finally {
            running.set(false);
        }
    }

    private void writeLog(StringBuilder sb) {
        try {
            if (sb == null) return;
            Path p = Path.of(logPath);
            Path parent = p.getParent();
            if (parent != null && !Files.exists(parent)) {
                Files.createDirectories(parent);
            }
            Files.writeString(p, sb.toString(), StandardCharsets.UTF_8,
                    StandardOpenOption.CREATE, StandardOpenOption.WRITE, StandardOpenOption.APPEND);
        } catch (Exception ignored) {
            // 不影响主流程
        }
    }

    private String safeLogValue(String s) {
        if (s == null) return "";
        // 避免极长异常刷爆日志：只截取前 500 字符
        if (s.length() > 500) return s.substring(0, 500);
        return s.replace("\r", " ").replace("\n", " ");
    }

    private Long fetchPlaytimeMinutes(Long steamId) {
        String url = "https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/"
                + "?key=" + steamApiKey
                + "&steamid=" + steamId
                + "&include_played_free_games=1"
                + "&appids_filter[0]=" + steamAppId
                + "&format=json";

        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> resp = restTemplate.getForObject(url, Map.class);
            if (resp == null) return null;

            Object respObj = resp.get("response");
            if (!(respObj instanceof Map)) return null;
            @SuppressWarnings("unchecked")
            Map<String, Object> response = (Map<String, Object>) respObj;

            Object gamesObj = response.get("games");
            if (!(gamesObj instanceof List)) return 0L;
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> games = (List<Map<String, Object>>) gamesObj;
            if (games == null || games.isEmpty()) return 0L;

            Object pt = games.get(0).get("playtime_forever");
            if (pt == null) return 0L;
            return Long.parseLong(pt.toString());
        } catch (RestClientException e) {
            return null;
        }
    }

    /**
     * 获取 Steam 昵称与头像（可选）
     */
    private Map<String, String> fetchSteamProfile(Long steamId) {
        String url = "https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/"
                + "?key=" + steamApiKey
                + "&steamids=" + steamId;

        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> resp = restTemplate.getForObject(url, Map.class);
            if (resp == null) return null;

            Object respObj = resp.get("response");
            if (!(respObj instanceof Map)) return null;
            @SuppressWarnings("unchecked")
            Map<String, Object> response = (Map<String, Object>) respObj;

            Object playersObj = response.get("players");
            if (!(playersObj instanceof List)) return null;
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> players = (List<Map<String, Object>>) playersObj;
            if (players.isEmpty()) return null;

            Map<String, Object> p = players.get(0);
            String personaName = p.get("personaname") != null ? p.get("personaname").toString() : null;
            String avatarUrl = p.get("avatarfull") != null ? p.get("avatarfull").toString() : null;

            Map<String, String> result = new HashMap<>();
            result.put("personaName", personaName);
            result.put("avatarUrl", avatarUrl);
            return result;
        } catch (RestClientException e) {
            return null;
        }
    }
}

