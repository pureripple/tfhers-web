package com.example.service;

import com.example.pojo.results;
import java.util.Map;

public interface ArticleLikeService {

    int getLikeCount(long articleId);

    boolean isLiked(long articleId, long userId);

    results toggleLike(long articleId, long userId);
}
