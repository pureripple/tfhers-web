package com.example.service;

import com.example.pojo.articles;
import com.example.pojo.results;
import org.springframework.stereotype.Service;


@Service
public interface articlesService {
    /**
     * 获取所有文章列表
     * @return 文章列表
     */
    results getAllArticles();
    
    /**
     * 根据id删除文章
     * @param id 文章id
     * @return 删除结果
     */
    results deleteArticleById(long id);
    
    /**
     * 新增文章
     * @param article 文章对象
     * @return 新增结果
     */
    results addArticle(articles article);
    
    /**
     * 根据ID查询单篇文章（含点赞数、当前用户是否已点赞）
     * @param id 文章ID
     * @param userId 当前用户ID，可为 null（未登录时 liked 为 false）
     * @return 查询结果，data 为 Map：article, likeCount, liked
     */
    results getArticleById(long id, Long userId);
    
    /**
     * 更新文章
     * @param article 文章对象
     * @return 更新结果
     */
    results updateArticle(articles article);
    
    /**
     * 搜索文章
     * @param keyword 搜索关键词
     * @return 搜索结果
     */
    results searchArticles(String keyword);

    /**
     * 仅更新置顶状态（管理端列表快捷切换）
     */
    results updateArticlePinned(long id, boolean pinned);

    /** 当前登录用户自己的资讯列表 */
    results getArticlesByAuthorId(long authorId);

    /** 删除资讯：本人作者或管理员可删 */
    results deleteArticleByIdForUser(long id, Long userId);
}

