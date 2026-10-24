package com.example.service;

import com.example.pojo.ArticleComment;
import com.example.pojo.results;

import java.util.List;

public interface ArticleCommentService {

    List<ArticleComment> getCommentTree(long articleId);

    results addComment(long articleId, long userId, String content, Long parentId);
}
