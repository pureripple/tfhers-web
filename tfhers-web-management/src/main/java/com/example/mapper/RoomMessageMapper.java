package com.example.mapper;

import com.example.pojo.RoomMessage;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface RoomMessageMapper {
    int insert(RoomMessage message);

    List<RoomMessage> listAfter(@Param("roomId") Long roomId,
                                @Param("afterId") Long afterId,
                                @Param("limit") int limit);

    List<RoomMessage> listRecent(@Param("roomId") Long roomId, @Param("limit") int limit);

    int deleteByRoomId(@Param("roomId") Long roomId);

    int countByRoomId(@Param("roomId") Long roomId);
}
