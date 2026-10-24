package com.example.scheduler;

import com.example.service.TournamentService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * 报名截止：registration_closes_at 到达后，将 status 从 registration 改为 closed。
 * 不自动生成对阵，仍由管理员手动点「生成对阵」。
 */
@Component
public class TournamentRegistrationCloseScheduler {

    private static final Logger log = LoggerFactory.getLogger(TournamentRegistrationCloseScheduler.class);

    @Autowired
    private TournamentService tournamentService;

    @Value("${tournaments.registration-auto-close.enabled:true}")
    private boolean enabled;

    /** 启动后稍等再扫一次，再按固定间隔扫描 */
    @Scheduled(
            fixedDelayString = "${tournaments.registration-auto-close.fixed-delay-ms:60000}",
            initialDelayString = "${tournaments.registration-auto-close.initial-delay-ms:8000}"
    )
    public void closeExpired() {
        if (!enabled) {
            return;
        }
        try {
            int n = tournamentService.closeExpiredRegistrations();
            if (n > 0) {
                log.info("Auto-closed {} tournament(s) after registration_closes_at", n);
            }
        } catch (Exception e) {
            log.error("Tournament registration auto-close failed: {}", e.getMessage(), e);
        }
    }
}
