package com.example.service.impl;

import com.example.mapper.ArticleLikeMapper;
import com.example.pojo.results;
import com.example.service.ArticleLikeService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

@Service
public class ArticleLikeServiceImpl implements ArticleLikeService {

    @Autowired
    private ArticleLikeMapper articleLikeMapper;

    @Override
    public int getLikeCount(long articleId) {
        return articleLikeMapper.countByArticleId(articleId);
    }

    @Override
    public boolean isLiked(long articleId, long userId) {
        return articleLikeMapper.exists(articleId, userId) > 0;
    }

    @Override
    public results toggleLike(long articleId, long userId) {
        try {
            boolean liked = articleLikeMapper.exists(articleId, userId) > 0;
            if (liked) {
                articleLikeMapper.delete(articleId, userId);
            } else {
                articleLikeMapper.insert(articleId, userId);
            }
            int likeCount = articleLikeMapper.countByArticleId(articleId);
            boolean newLiked = !liked;
            Map<String, Object> data = new HashMap<>();
            data.put("likeCount", likeCount);
            data.put("liked", newLiked);
            return results.success("操作成功", data);
        } catch (Exception e) {
            return results.error("操作失败: " + e.getMessage());
        }
    }
}
