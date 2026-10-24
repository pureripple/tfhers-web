package com.example.service.impl;

import com.example.mapper.AdminUserMapper;
import com.example.mapper.ArticleCommentMapper;
import com.example.mapper.ArticleLikeMapper;
import com.example.mapper.ContentReportMapper;
import com.example.mapper.articlesMapper;
import com.example.pojo.AdminUser;
import com.example.pojo.articles;
import com.example.pojo.results;
import com.example.service.ArticleLikeService;
import com.example.service.articlesService;
import com.example.util.OssUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class articlesServiceimpl implements articlesService {
    
    @Autowired
    private articlesMapper articlesMapper;
    @Autowired
    private AdminUserMapper adminUserMapper;
    @Autowired
    private ArticleLikeService articleLikeService;
    @Autowired
    private ArticleLikeMapper articleLikeMapper;
    @Autowired
    private ArticleCommentMapper articleCommentMapper;
    @Autowired
    private ContentReportMapper contentReportMapper;
    @Autowired
    private OssUtil ossUtil;

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
    @Transactional(rollbackFor = Exception.class)
    public results deleteArticleById(long id) {
        try {
            articles existing = articlesMapper.selectArticleById(id);
            if (existing != null) {
                if (existing.getCoverUrl() != null && !existing.getCoverUrl().isBlank()) {
                    ossUtil.deleteByUrlIfOwned(existing.getCoverUrl());
                }
                if (existing.getContent() != null && ossUtil.getDomain() != null) {
                    String domain = ossUtil.getDomain();
                    String regex = java.util.regex.Pattern.quote(domain) + "/([^\\s\"'<>]+)";
                    java.util.regex.Matcher m = java.util.regex.Pattern.compile(regex)
                            .matcher(existing.getContent());
                    while (m.find()) {
                        ossUtil.deleteFile(m.group(1));
                    }
                }
            }
            articleLikeMapper.deleteByArticleId(id);
            articleCommentMapper.deleteByArticleId(id);
            contentReportMapper.deleteByTarget("article", id);
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
            if (article.getIsPinned() == null) {
                article.setIsPinned(0);
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

            // 管理员发文且未填作者：默认用管理员真实姓名/用户名；已填写则保留（自主署名）
            if (article.getAuthorAdminId() != null
                    && (article.getAuthor() == null || article.getAuthor().trim().isEmpty())) {
                AdminUser admin = adminUserMapper.findById(article.getAuthorAdminId());
                if (admin != null) {
                    String displayName = (admin.getRealName() != null && !admin.getRealName().isBlank())
                            ? admin.getRealName().trim()
                            : admin.getUsername();
                    article.setAuthor(displayName);
                }
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
    public results getArticleById(long id, Long userId) {
        try {
            articles article = articlesMapper.selectArticleById(id);
            if (article == null) {
                return results.error("文章不存在");
            }
            articlesMapper.increaseViewCount(id);
            article.setViewCount(article.getViewCount() + 1);
            int likeCount = articleLikeService.getLikeCount(id);
            boolean liked = userId != null && articleLikeService.isLiked(id, userId);
            Map<String, Object> data = new HashMap<>();
            data.put("article", article);
            data.put("likeCount", likeCount);
            data.put("liked", liked);
            return results.success("查询文章成功", data);
        } catch (Exception e) {
            return results.error("查询文章失败: " + e.getMessage());
        }
    }
    
    @Override
    public results updateArticle(articles article) {
        try {
            if (article.getId() > 0 && article.getCoverUrl() != null) {
                articles old = articlesMapper.selectArticleById(article.getId());
                if (old != null && old.getCoverUrl() != null && !old.getCoverUrl().isBlank()
                        && !old.getCoverUrl().equals(article.getCoverUrl())) {
                    // cover changed: delete previous OSS object
                    ossUtil.deleteByUrlIfOwned(old.getCoverUrl());
                }
            }
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
            if (article.getIsPinned() == null) {
                article.setIsPinned(0);
            }

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

    @Override
    public results updateArticlePinned(long id, boolean pinned) {
        try {
            int n = articlesMapper.updateArticlePinned(id, pinned ? 1 : 0);
            if (n > 0) {
                return results.success(pinned ? "已置顶" : "已取消置顶", null);
            }
            return results.error("文章不存在或更新失败");
        } catch (Exception e) {
            return results.error("更新置顶失败: " + e.getMessage());
        }
    }

    @Override
    public results getArticlesByAuthorId(long authorId) {
        try {
            List<articles> list = articlesMapper.selectByAuthorId(authorId);
            return results.success("获取我的资讯成功", list);
        } catch (Exception e) {
            return results.error("获取我的资讯失败: " + e.getMessage());
        }
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public results deleteArticleByIdForUser(long id, Long userId) {
        if (userId == null) {
            return results.error(401, "请先登录");
        }
        try {
            articles existing = articlesMapper.selectArticleById(id);
            if (existing == null) {
                return results.error("文章不存在或已被删除");
            }
            boolean isAuthor = existing.getAuthorId() != null && existing.getAuthorId().equals(userId);
            boolean isAdminAuthor = existing.getAuthorAdminId() != null && existing.getAuthorAdminId().equals(userId);
            boolean isAdmin = adminUserMapper.findById(userId) != null;
            if (!isAuthor && !isAdminAuthor && !isAdmin) {
                return results.error(403, "只能删除自己发布的资讯");
            }
            return deleteArticleById(id);
        } catch (Exception e) {
            return results.error("删除文章失败: " + e.getMessage());
        }
    }

}
