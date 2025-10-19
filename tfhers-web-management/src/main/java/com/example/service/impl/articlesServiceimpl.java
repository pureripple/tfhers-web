package com.example.service.impl;

import com.example.mapper.articlesMapper;
import com.example.pojo.articles;
import com.example.pojo.results;
import com.example.service.articlesService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class articlesServiceimpl implements articlesService {
    
    @Autowired
    private articlesMapper articlesMapper;
    
    @Override
    public results getAllArticles() {
        try {
            List<articles> articles = articlesMapper.selectAllArticles();
            return results.success("获取文章列表成功", articles);
        } catch (Exception e) {
            return results.error("获取文章列表失败: " + e.getMessage());
        }
    }
    
    @Override
    public results deleteArticleById(long id) {
        try {
            int affectedRows = articlesMapper.deleteArticleById(id);
            if (affectedRows > 0) {
                return results.success("删除文章成功", null);
            } else {
                return results.error("文章不存在或已被删除");
            }
        } catch (Exception e) {
            return results.error("删除文章失败: " + e.getMessage());
        }
    }
    
    @Override
    public results addArticle(articles article) {
        try {
            // 设置默认值
            if (article.getViewCount() == 0) {
                article.setViewCount(0);
            }
            
            // 设置创建时间和更新时间
            String currentTime = java.time.LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
            article.setCreatedAt(currentTime);
            article.setUpdatedAt(currentTime);
            
            // 验证必填字段
            if (article.getTitle() == null || article.getTitle().trim().isEmpty()) {
                return results.error("文章标题不能为空");
            }
            if (article.getContent() == null || article.getContent().trim().isEmpty()) {
                return results.error("文章内容不能为空");
            }
            if (article.getAuthor() == null || article.getAuthor().trim().isEmpty()) {
                return results.error("作者不能为空");
            }
            
            int affectedRows = articlesMapper.insertArticle(article);
            if (affectedRows > 0) {
                return results.success("新增文章成功", article);
            } else {
                return results.error("新增文章失败");
            }
        } catch (Exception e) {
            return results.error("新增文章失败: " + e.getMessage());
        }
    }
    
    @Override
    public results getArticleById(long id) {
        try {
            articles article = articlesMapper.selectArticleById(id);
            if (article != null) {
                return results.success("查询文章成功", article);
            } else {
                return results.error("文章不存在");
            }
        } catch (Exception e) {
            return results.error("查询文章失败: " + e.getMessage());
        }
    }
    
    @Override
    public results updateArticle(articles article) {
        try {
            // 验证必填字段
            if (article.getTitle() == null || article.getTitle().trim().isEmpty()) {
                return results.error("文章标题不能为空");
            }
            if (article.getContent() == null || article.getContent().trim().isEmpty()) {
                return results.error("文章内容不能为空");
            }
            if (article.getAuthor() == null || article.getAuthor().trim().isEmpty()) {
                return results.error("作者不能为空");
            }
            
            // 设置更新时间
            String currentTime = java.time.LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
            article.setUpdatedAt(currentTime);
            
            int affectedRows = articlesMapper.updateArticle(article);
            if (affectedRows > 0) {
                return results.success("更新文章成功", article);
            } else {
                return results.error("文章不存在或更新失败");
            }
        } catch (Exception e) {
            return results.error("更新文章失败: " + e.getMessage());
        }
    }
    
    @Override
    public results searchArticles(String keyword) {
        try {
            // 验证搜索关键词
            if (keyword == null || keyword.trim().isEmpty()) {
                return results.error("搜索关键词不能为空");
            }
            
            List<articles> articles = articlesMapper.searchArticles(keyword.trim());
            return results.success("搜索完成", articles);
        } catch (Exception e) {
            return results.error("搜索文章失败: " + e.getMessage());
        }
    }
}
