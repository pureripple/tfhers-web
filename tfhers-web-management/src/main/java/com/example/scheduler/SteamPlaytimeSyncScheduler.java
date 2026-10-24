package com.example.scheduler;

import com.example.service.SteamPlaytimeSyncService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class SteamPlaytimeSyncScheduler {

    @Autowired
    private SteamPlaytimeSyncService steamPlaytimeSyncService;

    @Value("${steam.playtime-sync.enabled:true}")
    private boolean enabled;

    @Scheduled(fixedDelayString = "${steam.playtime-sync.fixed-delay-ms:1800000}")
    public void sync() {
        if (!enabled) return;
        steamPlaytimeSyncService.syncBoundUsersPlaytime();
    }
}

