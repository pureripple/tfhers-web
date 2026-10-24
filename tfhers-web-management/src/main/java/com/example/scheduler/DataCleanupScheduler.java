package com.example.scheduler;

import com.example.service.CleanupService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class DataCleanupScheduler {

    private static final Logger log = LoggerFactory.getLogger(DataCleanupScheduler.class);

    @Autowired
    private CleanupService cleanupService;

    @Value("${cleanup.rooms.enabled:true}")
    private boolean roomsEnabled;

    @Value("${cleanup.oss-orphans.enabled:true}")
    private boolean ossEnabled;

    @Value("${cleanup.content-reports.enabled:true}")
    private boolean reportsEnabled;

    @Scheduled(cron = "${cleanup.rooms.cron:0 30 3 * * ?}")
    public void purgeRooms() {
        if (!roomsEnabled) {
            return;
        }
        try {
            log.info("Scheduled room purge start");
            cleanupService.purgeExpiredClosedRooms();
        } catch (Exception e) {
            log.error("Scheduled room purge failed: {}", e.getMessage(), e);
        }
    }

    @Scheduled(cron = "${cleanup.oss-orphans.cron:0 0 4 * * ?}")
    public void purgeOssOrphans() {
        if (!ossEnabled) {
            return;
        }
        try {
            log.info("Scheduled OSS orphan cleanup start");
            cleanupService.cleanupOssOrphans();
        } catch (Exception e) {
            log.error("Scheduled OSS orphan cleanup failed: {}", e.getMessage(), e);
        }
    }

    @Scheduled(cron = "${cleanup.content-reports.cron:0 0 5 * * ?}")
    public void purgeReports() {
        if (!reportsEnabled) {
            return;
        }
        try {
            log.info("Scheduled content_report purge start");
            cleanupService.purgeOldResolvedReports();
        } catch (Exception e) {
            log.error("Scheduled content_report purge failed: {}", e.getMessage(), e);
        }
    }
}