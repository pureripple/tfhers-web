package com.example.service;

/**
 * 定时同步：将已绑定 Steam 的用户的总游戏时长写回缓存字段，并写入历史快照。
 */
public interface SteamPlaytimeSyncService {
    void syncBoundUsersPlaytime();
}

