package com.example.scheduler;

import com.example.service.RoomService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * 房间在线心跳清扫：成员 last_seen 超过阈值视为离线并自动退房。
 */
@Component
public class RoomPresenceScheduler {

    private static final Logger log = LoggerFactory.getLogger(RoomPresenceScheduler.class);

    @Autowired
    private RoomService roomService;

    @Value("${rooms.presence.enabled:true}")
    private boolean enabled;

    @Value("${rooms.presence.timeout-seconds:300}")
    private int timeoutSeconds;

    @Scheduled(fixedDelayString = "${rooms.presence.sweep-interval-ms:15000}")
    public void sweepOffline() {
        if (!enabled) {
            return;
        }
        try {
            int n = roomService.sweepOfflineMembers(Math.max(15, timeoutSeconds));
            if (n > 0) {
                log.info("Room presence sweep removed {} stale member(s), timeout={}s", n, timeoutSeconds);
            }
        } catch (Exception e) {
            log.error("Room presence sweep failed: {}", e.getMessage(), e);
        }
    }
}
