package com.example.service;

import java.util.Map;

public interface CleanupService {
    /** 硬删 CLOSED 超过保留期的房间（含 messages / members） */
    Map<String, Object> purgeExpiredClosedRooms();

    /** 扫描 OSS 孤儿对象并删除（或 dry-run） */
    Map<String, Object> cleanupOssOrphans();

    /** 清理已处理的旧举报 */
    Map<String, Object> purgeOldResolvedReports();

    /** 一次跑完上述三项 */
    Map<String, Object> runAll();
}
