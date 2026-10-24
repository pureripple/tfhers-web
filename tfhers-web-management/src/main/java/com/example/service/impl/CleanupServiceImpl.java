package com.example.service.impl;

import com.example.mapper.CleanupMapper;
import com.example.mapper.RoomMapper;
import com.example.mapper.RoomMemberMapper;
import com.example.mapper.RoomMessageMapper;
import com.example.pojo.Room;
import com.example.service.CleanupService;
import com.example.util.OssUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class CleanupServiceImpl implements CleanupService {

    private static final Logger log = LoggerFactory.getLogger(CleanupServiceImpl.class);

    private static final String[] OSS_PREFIXES = {
            "avatars/", "articles/", "combos/", "characters/"
    };

    private static final int ROOM_BATCH = 200;
    private static final int OSS_LIST_CAP = 5000;

    @Autowired
    private RoomMapper roomMapper;
    @Autowired
    private RoomMemberMapper roomMemberMapper;
    @Autowired
    private RoomMessageMapper roomMessageMapper;
    @Autowired
    private CleanupMapper cleanupMapper;
    @Autowired
    private OssUtil ossUtil;

    @Value("${cleanup.rooms.retention-days:7}")
    private int roomRetentionDays;

    @Value("${cleanup.oss-orphans.min-age-days:7}")
    private int ossMinAgeDays;

    @Value("${cleanup.oss-orphans.dry-run:false}")
    private boolean ossDryRun;

    @Value("${cleanup.oss-orphans.max-delete-per-run:200}")
    private int ossMaxDeletePerRun;

    @Value("${cleanup.content-reports.retention-days:90}")
    private int reportRetentionDays;

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> purgeExpiredClosedRooms() {
        LocalDateTime cutoff = LocalDateTime.now().minusDays(Math.max(1, roomRetentionDays));
        List<Room> expired = roomMapper.listClosedBefore(cutoff, ROOM_BATCH);
        int rooms = 0;
        int members = 0;
        int messages = 0;
        List<Long> purgedIds = new ArrayList<>();
        for (Room room : expired) {
            if (room == null || room.getId() == null) {
                continue;
            }
            Long roomId = room.getId();
            messages += roomMessageMapper.deleteByRoomId(roomId);
            members += roomMemberMapper.deleteByRoomId(roomId);
            roomMapper.deleteById(roomId);
            rooms += 1;
            purgedIds.add(roomId);
        }
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("retentionDays", roomRetentionDays);
        result.put("cutoff", cutoff.toString());
        result.put("purgedRooms", rooms);
        result.put("deletedMembers", members);
        result.put("deletedMessages", messages);
        result.put("roomIds", purgedIds);
        result.put("closedRemaining", roomMapper.countByStatus("CLOSED"));
        log.info("Room purge done: rooms={}, members={}, messages={}, cutoff={}",
                rooms, members, messages, cutoff);
        return result;
    }

    @Override
    public Map<String, Object> cleanupOssOrphans() {
        Set<String> referenced = collectReferencedObjectKeys();
        Instant ageCutoff = Instant.now().minus(Math.max(1, ossMinAgeDays), ChronoUnit.DAYS);

        int scanned = 0;
        int orphanCandidates = 0;
        int deleted = 0;
        long freedBytes = 0;
        List<String> deletedKeys = new ArrayList<>();
        List<String> sampleOrphans = new ArrayList<>();

        for (String prefix : OSS_PREFIXES) {
            List<OssUtil.OssObjectInfo> objects;
            try {
                objects = ossUtil.listObjects(prefix, OSS_LIST_CAP);
            } catch (Exception e) {
                Map<String, Object> err = new LinkedHashMap<>();
                err.put("error", "list OSS failed: " + e.getMessage());
                err.put("prefix", prefix);
                err.put("hint", "Need ListObjects/DeleteObject permission on OSS AK");
                return err;
            }
            for (OssUtil.OssObjectInfo obj : objects) {
                scanned++;
                String key = obj.getKey();
                if (key == null) {
                    continue;
                }
                if (isReferenced(referenced, key)) {
                    continue;
                }
                Instant lm = obj.getLastModified();
                if (lm != null && lm.isAfter(ageCutoff)) {
                    continue;
                }
                orphanCandidates++;
                if (sampleOrphans.size() < 20) {
                    sampleOrphans.add(key);
                }
                if (ossDryRun || deleted >= ossMaxDeletePerRun) {
                    continue;
                }
                if (ossUtil.deleteFile(key)) {
                    deleted++;
                    freedBytes += Math.max(0, obj.getSize());
                    if (deletedKeys.size() < 50) {
                        deletedKeys.add(key);
                    }
                }
            }
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("dryRun", ossDryRun);
        result.put("minAgeDays", ossMinAgeDays);
        result.put("referencedKeys", referenced.size());
        result.put("scannedObjects", scanned);
        result.put("orphanCandidates", orphanCandidates);
        result.put("deleted", deleted);
        result.put("freedBytes", freedBytes);
        result.put("maxDeletePerRun", ossMaxDeletePerRun);
        result.put("sampleOrphans", sampleOrphans);
        result.put("deletedKeysSample", deletedKeys);
        log.info("OSS orphan cleanup: scanned={}, orphans={}, deleted={}, dryRun={}",
                scanned, orphanCandidates, deleted, ossDryRun);
        return result;
    }

    private boolean isReferenced(Set<String> referenced, String key) {
        String norm = normalizeKey(key);
        if (referenced.contains(key) || referenced.contains(norm)) {
            return true;
        }
        String dbl = doubleSlashVariant(norm);
        return referenced.contains(dbl);
    }

    private Set<String> collectReferencedObjectKeys() {
        Set<String> keys = new HashSet<>();
        addUrlKeys(keys, cleanupMapper.listUserAvatarUrls());
        addUrlKeys(keys, cleanupMapper.listAdminAvatarUrls());
        addUrlKeys(keys, cleanupMapper.listArticleCoverUrls());
        addUrlKeys(keys, cleanupMapper.listComboVideoUrls());
        addUrlKeys(keys, cleanupMapper.listComboFileUrls());
        addUrlKeys(keys, cleanupMapper.listCharacterAvatarUrls());
        addUrlKeys(keys, cleanupMapper.listCharacterMoveListUrls());
        try {
            addUrlKeys(keys, cleanupMapper.listReportEvidenceUrls());
        } catch (Exception e) {
            log.warn("skip content_report evidence urls: {}", e.getMessage());
        }
        String domain = ossUtil.getDomain();
        Pattern p = Pattern.compile(
                Pattern.quote(domain) + "/([^\\s\"'<>]+)",
                Pattern.CASE_INSENSITIVE);
        List<String> contents = cleanupMapper.listArticleContents();
        if (contents != null) {
            for (String html : contents) {
                if (html == null || html.isBlank()) {
                    continue;
                }
                Matcher m = p.matcher(html);
                while (m.find()) {
                    String key = m.group(1);
                    if (key != null && !key.isBlank()) {
                        keys.add(key);
                        keys.add(normalizeKey(key));
                    }
                }
            }
        }
        return keys;
    }

    private void addUrlKeys(Set<String> keys, List<String> urls) {
        if (urls == null) {
            return;
        }
        for (String url : urls) {
            String key = ossUtil.extractObjectKeyFromUrl(url);
            if (key != null) {
                keys.add(key);
                keys.add(normalizeKey(key));
            }
        }
    }

    private static String normalizeKey(String key) {
        if (key == null) {
            return null;
        }
        String k = key.replaceAll("/{2,}", "/");
        if (k.startsWith("/")) {
            k = k.substring(1);
        }
        return k;
    }

    /** avatars/xxx -> avatars//xxx (legacy upload path) */
    private static String doubleSlashVariant(String key) {
        if (key == null || !key.contains("/")) {
            return key;
        }
        int i = key.indexOf('/');
        return key.substring(0, i) + "/" + key.substring(i);
    }

    @Override
    public Map<String, Object> purgeOldResolvedReports() {
        LocalDateTime cutoff = LocalDateTime.now().minusDays(Math.max(1, reportRetentionDays));
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("retentionDays", reportRetentionDays);
        result.put("cutoff", cutoff.toString());
        try {
            int before = cleanupMapper.countResolvedReportsBefore(cutoff);
            int deleted = cleanupMapper.deleteResolvedReportsBefore(cutoff);
            result.put("matched", before);
            result.put("deleted", deleted);
        } catch (Exception e) {
            result.put("error", e.getMessage());
            result.put("hint", "Ignore if content_report table missing");
        }
        return result;
    }

    @Override
    public Map<String, Object> runAll() {
        Map<String, Object> all = new LinkedHashMap<>();
        all.put("rooms", purgeExpiredClosedRooms());
        all.put("ossOrphans", cleanupOssOrphans());
        all.put("contentReports", purgeOldResolvedReports());
        return all;
    }
}