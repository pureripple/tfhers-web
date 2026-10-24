package com.example.service;

import com.example.pojo.results;

public interface RoomService {
    results listRooms(Long userId);

    results createRoom(Long userId, String title, String password, Integer maxPlayers);

    results getRoomDetail(Long roomId, Long userId);

    results joinRoom(Long roomId, Long userId, String password);

    results leaveRoom(Long roomId, Long userId);

    results closeRoom(Long roomId, Long userId);

    results listMembers(Long roomId, Long userId);

    results listMessages(Long roomId, Long userId, Long afterId);

    results postMessage(Long roomId, Long userId, String content, String msgType);

    /** 清扫心跳超时成员：离线退房；房主离线则转让或关房 */
    int sweepOfflineMembers(int timeoutSeconds);
}
