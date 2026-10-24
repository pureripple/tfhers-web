package com.example.service;

import com.example.pojo.results;

import java.util.Map;

public interface UserFeedbackService {
    /** 用户提交反馈 */
    results submit(Long userId, String category, String title, String content, String contact);

    /** 当前用户自己的反馈列表 */
    Map<String, Object> listMine(Long userId, int page, int size);

    /** 管理端分页列表 */
    Map<String, Object> listForAdmin(int page, int size, Integer status, String category);

    /** 管理端更新状态与回复 */
    results updateStatus(Long id, Integer status, String adminReply);

    /** unread reply count for current user */
    int countUnread(Long userId);

    /** mark current user's replied feedback as read */
    results markAllRead(Long userId);
}
