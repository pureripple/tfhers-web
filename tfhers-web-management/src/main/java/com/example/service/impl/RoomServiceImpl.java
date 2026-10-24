package com.example.service.impl;

import com.example.mapper.RoomMapper;
import com.example.mapper.RoomMemberMapper;
import com.example.mapper.RoomMessageMapper;
import com.example.pojo.Room;
import com.example.pojo.RoomMember;
import com.example.pojo.RoomMessage;
import com.example.pojo.results;
import com.example.service.RoomService;
import com.example.util.EloUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class RoomServiceImpl implements RoomService {

    private static final int TITLE_MAX = 80;
    private static final int CONTENT_MAX = 1000;
    private static final int MSG_LIMIT = 100;
    private static final int STALE_BATCH = 100;

    @Autowired
    private RoomMapper roomMapper;

    @Autowired
    private RoomMemberMapper roomMemberMapper;

    @Autowired
    private RoomMessageMapper roomMessageMapper;

    @Autowired
    private BCryptPasswordEncoder passwordEncoder;

    @Override
    public results listRooms(Long userId) {
        List<Room> list = roomMapper.listOpenOrFull();
        List<Room> ordered = new ArrayList<>(list.size());
        Room own = null;
        for (Room r : list) {
            sanitizeRoom(r, userId);
            if (userId != null && Boolean.TRUE.equals(r.getIsHost()) && own == null) {
                own = r;
            } else {
                ordered.add(r);
            }
        }
        if (own != null) {
            ordered.add(0, own);
        }
        return results.success("获取成功", ordered);
    }

    @Override
    @Transactional
    public results createRoom(Long userId, String title, String password, Integer maxPlayers) {
        if (userId == null) {
            return results.error(401, "请先登录");
        }
        String t = title == null ? "" : title.trim();
        if (t.isEmpty()) {
            return results.error("请填写房间标题");
        }
        if (t.length() > TITLE_MAX) {
            return results.error("标题最多 " + TITLE_MAX + " 字");
        }
        int max = maxPlayers == null ? 4 : maxPlayers;
        if (max < 2 || max > 8) {
            return results.error("人数上限须为 2–8");
        }
        if (roomMapper.countOpenByHost(userId) > 0) {
            return results.error("你已有一个开放中的房间，请先关闭后再创建");
        }
        // 同时只能待在一个房间：建房前离开其它房间
        leaveOtherOpenRooms(userId, null);

        Room room = new Room();
        room.setTitle(t);
        room.setMaxPlayers(max);
        room.setStatus("OPEN");
        room.setHostUserId(userId);
        room.setMemberCount(1);
        if (password != null && !password.isBlank()) {
            String plain = password.trim();
            if (plain.length() > 40) {
                return results.error("房间密码最多 40 字");
            }
            room.setPasswordHash(passwordEncoder.encode(plain));
            room.setPasswordPlain(plain);
        } else {
            room.setPasswordHash(null);
            room.setPasswordPlain(null);
        }
        roomMapper.insert(room);

        RoomMember host = new RoomMember();
        host.setRoomId(room.getId());
        host.setUserId(userId);
        host.setRole("host");
        roomMemberMapper.insert(host);

        Room created = roomMapper.findById(room.getId());
        sanitizeRoom(created, userId);
        return results.success("房间已创建", created);
    }

    @Override
    public results getRoomDetail(Long roomId, Long userId) {
        Room room = roomMapper.findById(roomId);
        if (room == null) {
            return results.error("房间不存在");
        }
        touchHeartbeat(roomId, userId);
        sanitizeRoom(room, userId);
        List<RoomMember> members = roomMemberMapper.listByRoomId(roomId);
        enrichMemberTiers(members);

        Map<String, Object> data = new HashMap<>();
        data.put("room", room);
        data.put("members", members);
        data.put("tip", "本房间仅用于互相联系、约定上线对战；对局请自行在 Steam 启动《Them's Fightin' Herds》。");
        return results.success("获取成功", data);
    }

    @Override
    @Transactional
    public results joinRoom(Long roomId, Long userId, String password) {
        if (userId == null) {
            return results.error(401, "请先登录");
        }
        Room room = roomMapper.findById(roomId);
        if (room == null) {
            return results.error("房间不存在");
        }
        if ("CLOSED".equalsIgnoreCase(room.getStatus())) {
            return results.error("房间已关闭");
        }
        RoomMember existing = roomMemberMapper.find(roomId, userId);
        if (existing != null) {
            roomMemberMapper.touchLastSeen(roomId, userId);
            sanitizeRoom(room, userId);
            return results.success("已在房间内", room);
        }
        if ("FULL".equalsIgnoreCase(room.getStatus())
                || (room.getMemberCount() != null && room.getMaxPlayers() != null
                && room.getMemberCount() >= room.getMaxPlayers())) {
            return results.error("房间已满");
        }
        boolean needPwd = room.getPasswordHash() != null && !room.getPasswordHash().isBlank();
        if (needPwd) {
            if (password == null || password.isBlank()) {
                return results.error("请输入房间密码");
            }
            if (!passwordEncoder.matches(password.trim(), room.getPasswordHash())) {
                return results.error("房间密码错误");
            }
        }

        // Discord 式：加入新房前自动离开当前房间
        leaveOtherOpenRooms(userId, roomId);

        RoomMember member = new RoomMember();
        member.setRoomId(roomId);
        member.setUserId(userId);
        member.setRole("member");
        roomMemberMapper.insert(member);

        int count = roomMemberMapper.countByRoomId(roomId);
        String status = count >= room.getMaxPlayers() ? "FULL" : "OPEN";
        roomMapper.updateStatusAndCount(roomId, status, count);

        Room updated = roomMapper.findById(roomId);
        sanitizeRoom(updated, userId);
        return results.success("已加入房间", updated);
    }

    @Override
    @Transactional
    public results leaveRoom(Long roomId, Long userId) {
        if (userId == null) {
            return results.error(401, "请先登录");
        }
        Room room = roomMapper.findById(roomId);
        if (room == null) {
            return results.error("房间不存在");
        }
        RoomMember me = roomMemberMapper.find(roomId, userId);
        if (me == null) {
            return results.error("你不在该房间内");
        }
        String msg = removeMemberInternal(roomId, userId, me, room);
        return results.success(msg, null);
    }

    @Override
    @Transactional
    public results closeRoom(Long roomId, Long userId) {
        if (userId == null) {
            return results.error(401, "请先登录");
        }
        Room room = roomMapper.findById(roomId);
        if (room == null) {
            return results.error("房间不存在");
        }
        if (!userId.equals(room.getHostUserId())) {
            return results.error(403, "仅房主可关闭房间");
        }
        if ("CLOSED".equalsIgnoreCase(room.getStatus())) {
            return results.success("房间已关闭", null);
        }
        roomMapper.closeRoom(roomId);
        return results.success("房间已关闭", null);
    }

    @Override
    public results listMembers(Long roomId, Long userId) {
        Room room = roomMapper.findById(roomId);
        if (room == null) {
            return results.error("房间不存在");
        }
        touchHeartbeat(roomId, userId);
        List<RoomMember> members = roomMemberMapper.listByRoomId(roomId);
        enrichMemberTiers(members);
        return results.success("获取成功", members);
    }

    @Override
    public results listMessages(Long roomId, Long userId, Long afterId) {
        if (userId == null) {
            return results.error(401, "请先登录");
        }
        Room room = roomMapper.findById(roomId);
        if (room == null) {
            return results.error("房间不存在");
        }
        if (!isMember(roomId, userId)) {
            return results.error(403, "加入房间后才能查看聊天");
        }
        touchHeartbeat(roomId, userId);
        long after = afterId == null ? 0L : afterId;
        List<RoomMessage> list;
        if (after <= 0) {
            list = roomMessageMapper.listRecent(roomId, MSG_LIMIT);
        } else {
            list = roomMessageMapper.listAfter(roomId, after, MSG_LIMIT);
        }
        Map<String, Object> data = new HashMap<>();
        data.put("messages", list);
        data.put("roomStatus", room.getStatus());
        return results.success("获取成功", data);
    }

    @Override
    @Transactional
    public results postMessage(Long roomId, Long userId, String content, String msgType) {
        if (userId == null) {
            return results.error(401, "请先登录");
        }
        Room room = roomMapper.findById(roomId);
        if (room == null) {
            return results.error("房间不存在");
        }
        if ("CLOSED".equalsIgnoreCase(room.getStatus())) {
            return results.error("房间已关闭，无法发言");
        }
        if (!isMember(roomId, userId)) {
            return results.error(403, "加入房间后才能发言");
        }
        String type = msgType == null || msgType.isBlank() ? "text" : msgType.trim().toLowerCase();
        if (!"text".equals(type) && !"image".equals(type)) {
            return results.error("不支持的消息类型");
        }
        String text = content == null ? "" : content.trim();
        if (text.isEmpty()) {
            return results.error("消息不能为空");
        }
        if (text.length() > CONTENT_MAX) {
            return results.error("消息最多 " + CONTENT_MAX + " 字");
        }
        if ("image".equals(type)) {
            if (!(text.startsWith("http://") || text.startsWith("https://"))) {
                return results.error("图片地址无效");
            }
        }
        touchHeartbeat(roomId, userId);
        RoomMessage msg = new RoomMessage();
        msg.setRoomId(roomId);
        msg.setUserId(userId);
        msg.setContent(text);
        msg.setMsgType(type);
        roomMessageMapper.insert(msg);

        List<RoomMessage> just = roomMessageMapper.listAfter(roomId, msg.getId() - 1, 1);
        RoomMessage out = just.isEmpty() ? msg : just.get(0);
        return results.success("已发送", out);
    }

    @Override
    @Transactional
    public int sweepOfflineMembers(int timeoutSeconds) {
        int timeout = Math.max(15, timeoutSeconds);
        LocalDateTime cutoff = LocalDateTime.now().minusSeconds(timeout);
        List<RoomMember> stale = roomMemberMapper.listStaleInOpenRooms(cutoff, STALE_BATCH);
        if (stale == null || stale.isEmpty()) {
            return 0;
        }
        int removed = 0;
        for (RoomMember m : stale) {
            if (m == null || m.getRoomId() == null || m.getUserId() == null) {
                continue;
            }
            Room room = roomMapper.findById(m.getRoomId());
            if (room == null || "CLOSED".equalsIgnoreCase(room.getStatus())) {
                continue;
            }
            RoomMember fresh = roomMemberMapper.find(m.getRoomId(), m.getUserId());
            if (fresh == null) {
                continue;
            }
            if (fresh.getLastSeenAt() != null && fresh.getLastSeenAt().isAfter(cutoff)) {
                continue;
            }
            removeMemberInternal(m.getRoomId(), m.getUserId(), fresh, room);
            removed++;
        }
        return removed;
    }

    /** 离开用户当前所在的其它开放房间（excludeRoomId 可空） */
    private void leaveOtherOpenRooms(Long userId, Long excludeRoomId) {
        for (int i = 0; i < 8; i++) {
            RoomMember membership = roomMemberMapper.findOpenMembershipByUser(userId);
            if (membership == null) {
                return;
            }
            if (excludeRoomId != null && excludeRoomId.equals(membership.getRoomId())) {
                return;
            }
            Room other = roomMapper.findById(membership.getRoomId());
            if (other != null) {
                removeMemberInternal(membership.getRoomId(), userId, membership, other);
            } else {
                roomMemberMapper.delete(membership.getRoomId(), userId);
            }
        }
    }

    /**
     * 移除成员。若为房主：转让给剩余成员中加入最早者；无人则关闭房间。
     * @return 面向用户的结果文案
     */
    private String removeMemberInternal(Long roomId, Long userId, RoomMember me, Room room) {
        boolean wasHost = "host".equalsIgnoreCase(me.getRole()) || userId.equals(room.getHostUserId());
        roomMemberMapper.delete(roomId, userId);

        if ("CLOSED".equalsIgnoreCase(room.getStatus())) {
            return "已离开房间";
        }

        if (wasHost) {
            RoomMember next = roomMemberMapper.findEarliestExcept(roomId, userId);
            if (next == null) {
                roomMapper.closeRoom(roomId);
                return "房主已离开，房间已关闭";
            }
            roomMapper.transferHost(roomId, next.getUserId());
            roomMemberMapper.updateRole(roomId, next.getUserId(), "host");
            int count = roomMemberMapper.countByRoomId(roomId);
            Integer max = room.getMaxPlayers();
            String status = (max != null && count >= max) ? "FULL" : "OPEN";
            roomMapper.updateStatusAndCount(roomId, status, count);
            return "已离开房间，房主已转让";
        }

        int count = roomMemberMapper.countByRoomId(roomId);
        Integer max = room.getMaxPlayers();
        String status = (max != null && count >= max) ? "FULL" : "OPEN";
        roomMapper.updateStatusAndCount(roomId, status, count);
        return "已离开房间";
    }

    private void touchHeartbeat(Long roomId, Long userId) {
        if (userId == null || roomId == null) return;
        if (roomMemberMapper.find(roomId, userId) != null) {
            roomMemberMapper.touchLastSeen(roomId, userId);
        }
    }

    private boolean isMember(Long roomId, Long userId) {
        if (userId == null) return false;
        return roomMemberMapper.find(roomId, userId) != null;
    }

    private void sanitizeRoom(Room room, Long userId) {
        if (room == null) return;
        boolean hasPwd = room.getPasswordHash() != null && !room.getPasswordHash().isBlank();
        room.setHasPassword(hasPwd);
        room.setPasswordHash(null); // 绝不返回哈希
        boolean joined = userId != null && roomMemberMapper.find(room.getId(), userId) != null;
        room.setJoinedByMe(joined);
        boolean host = userId != null && userId.equals(room.getHostUserId());
        room.setIsHost(host);
        // 明文密码仅房主可见
        if (!host) {
            room.setPasswordPlain(null);
        }
    }

    private void enrichMemberTiers(List<RoomMember> members) {
        if (members == null) return;
        for (RoomMember m : members) {
            int rating = m.getRating() != null ? m.getRating() : EloUtil.DEFAULT_RATING;
            m.setRating(rating);
            m.setTier(EloUtil.tierOf(rating));
        }
    }
}
