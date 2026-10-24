package com.example.mapper;

import com.example.pojo.RoomMember;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.time.LocalDateTime;
import java.util.List;

@Mapper
public interface RoomMemberMapper {
    int insert(RoomMember member);

    int delete(@Param("roomId") Long roomId, @Param("userId") Long userId);

    int deleteByRoomId(@Param("roomId") Long roomId);

    RoomMember find(@Param("roomId") Long roomId, @Param("userId") Long userId);

    List<RoomMember> listByRoomId(@Param("roomId") Long roomId);

    int countByRoomId(@Param("roomId") Long roomId);

    int touchLastSeen(@Param("roomId") Long roomId, @Param("userId") Long userId);

    /** 用户在开放房间中的成员记录（至多一条业务约束） */
    RoomMember findOpenMembershipByUser(@Param("userId") Long userId);

    /** 除指定用户外，按加入时间最早的一名成员（用于房主转让） */
    RoomMember findEarliestExcept(@Param("roomId") Long roomId, @Param("excludeUserId") Long excludeUserId);

    int updateRole(@Param("roomId") Long roomId, @Param("userId") Long userId, @Param("role") String role);

    /** last_seen_at 早于 cutoff 且所在房间仍开放的成员 */
    List<RoomMember> listStaleInOpenRooms(@Param("cutoff") LocalDateTime cutoff, @Param("limit") int limit);
}
