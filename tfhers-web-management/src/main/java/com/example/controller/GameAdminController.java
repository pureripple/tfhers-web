package com.example.controller;

import com.example.mapper.GameAchievementSchemaMapper;
import com.example.pojo.GameAchievementSchema;
import com.example.pojo.results;
import com.example.service.AdminUserService;
import com.example.util.OssUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestTemplate;

import jakarta.servlet.http.HttpServletRequest;
import java.io.InputStream;
import java.net.URL;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 管理端：游戏管理
 */
@RestController
@RequestMapping("/api/admin/games")
@CrossOrigin(origins = "*")
public class GameAdminController {

    @Autowired
    private AdminUserService adminUserService;

    @Autowired
    private GameAchievementSchemaMapper gameAchievementSchemaMapper;

    @Autowired
    private OssUtil ossUtil;

    @Value("${steam.api-key}")
    private String steamApiKey;

    @Value("${steam.app-id}")
    private Long steamAppId;

    private final RestTemplate restTemplate = new RestTemplate();

    /**
     * 手动同步 Steam 全量成就 schema：名称/描述/图标（转存 OSS）入库
     */
    @PostMapping("/steam/achievements/sync")
    public results syncSteamAchievementSchema(HttpServletRequest request) {
        try {
            Long adminId = (Long) request.getAttribute("userId");
            if (adminId == null || adminUserService.findById(adminId) == null) {
                return results.error(401, "未授权");
            }
            if (steamAppId == null || steamAppId <= 0) {
                return results.error("未配置 steam.app-id");
            }
            if (steamApiKey == null || steamApiKey.isBlank()) {
                return results.error("未配置 steam.api-key");
            }

            Map<String, Map<String, Object>> schema = fetchAchievementSchema("schinese");
            if (schema.isEmpty()) {
                return results.error("从 Steam 获取成就 schema 为空");
            }

            int uploaded = 0;
            int failed = 0;
            List<GameAchievementSchema> rows = new ArrayList<>(schema.size());
            for (Map.Entry<String, Map<String, Object>> e : schema.entrySet()) {
                String apiName = e.getKey();
                Map<String, Object> info = e.getValue();
                if (apiName == null || apiName.isBlank() || info == null) continue;

                String displayName = info.get("displayName") != null ? info.get("displayName").toString() : null;
                String description = info.get("description") != null ? info.get("description").toString() : null;
                String icon = info.get("icon") != null ? info.get("icon").toString() : null;
                String iconGray = info.get("icongray") != null ? info.get("icongray").toString() : null;

                String iconUrl = transferIconToOss(icon, apiName, false);
                String iconGrayUrl = transferIconToOss(iconGray, apiName, true);

                // 统计（只要返回的是 OSS 域名就认为成功；否则视为失败但仍入库 Steam URL）
                boolean iconOssOk = iconUrl != null && iconUrl.contains(".aliyuncs.com/");
                boolean iconGrayOssOk = iconGrayUrl != null && iconGrayUrl.contains(".aliyuncs.com/");
                if (icon != null || iconGray != null) {
                    if (iconOssOk || iconGrayOssOk) uploaded++;
                    else failed++;
                }

                GameAchievementSchema row = new GameAchievementSchema();
                row.setAppId(steamAppId);
                row.setApiName(apiName);
                row.setDisplayName(displayName);
                row.setDescription(description);
                row.setIconUrl(iconUrl);
                row.setIconGrayUrl(iconGrayUrl);
                rows.add(row);
            }

            if (!rows.isEmpty()) {
                gameAchievementSchemaMapper.upsertBatch(rows);
            }

            Map<String, Object> data = new HashMap<>();
            data.put("appId", steamAppId);
            data.put("total", schema.size());
            data.put("upserted", rows.size());
            data.put("uploadedAny", uploaded);
            data.put("failedAny", failed);
            data.put("updatedAt", LocalDateTime.now());
            return results.success("同步成功", data);
        } catch (Exception e) {
            e.printStackTrace();
            return results.error("同步失败：" + e.getMessage());
        }
    }

    private Map<String, Map<String, Object>> fetchAchievementSchema(String lang) {
        String url = "https://api.steampowered.com/ISteamUserStats/GetSchemaForGame/v2/"
                + "?key=" + steamApiKey
                + "&appid=" + steamAppId
                + (lang != null ? "&l=" + lang : "");
        @SuppressWarnings("unchecked")
        Map<String, Object> resp = restTemplate.getForObject(url, Map.class);
        Map<String, Map<String, Object>> out = new HashMap<>();
        if (resp == null) return out;
        Object gameObj = resp.get("game");
        if (!(gameObj instanceof Map)) return out;
        @SuppressWarnings("unchecked")
        Map<String, Object> game = (Map<String, Object>) gameObj;
        Object statsObj = game.get("availableGameStats");
        if (!(statsObj instanceof Map)) return out;
        @SuppressWarnings("unchecked")
        Map<String, Object> stats = (Map<String, Object>) statsObj;
        Object achvObj = stats.get("achievements");
        if (!(achvObj instanceof List)) return out;
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> achvs = (List<Map<String, Object>>) achvObj;
        for (Map<String, Object> a : achvs) {
            String apiName = a.get("name") != null ? a.get("name").toString() : null;
            if (apiName == null) continue;
            Map<String, Object> info = new HashMap<>();
            info.put("displayName", a.get("displayName"));
            info.put("description", a.get("description"));
            info.put("icon", a.get("icon"));
            info.put("icongray", a.get("icongray"));
            out.put(apiName, info);
        }
        return out;
    }

    private String transferIconToOss(String url, String apiName, boolean gray) {
        if (url == null || url.isBlank()) return url;
        if (apiName == null || apiName.isBlank()) return url;
        String fileName = gray ? "icongray.jpg" : "icon.jpg";
        String objectKey = "steam/achievements/" + steamAppId + "/" + apiName + "/" + fileName;
        if (ossUtil.exists(objectKey)) {
            return ossUtil.buildUrl(objectKey);
        }
        try (InputStream in = new URL(url).openStream()) {
            return ossUtil.uploadStream(in, objectKey, "image/jpeg");
        } catch (Exception e) {
            return url; // 转存失败则保留 Steam URL
        }
    }
}

