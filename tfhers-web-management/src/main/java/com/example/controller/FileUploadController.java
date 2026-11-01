package com.example.controller;

import com.example.pojo.results;
import com.example.util.OssUtil;
import jakarta.servlet.http.HttpServletRequest;
import java.util.HashMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping(value={"/api/file"})
public class FileUploadController {
    private static final Logger log = LoggerFactory.getLogger(FileUploadController.class);
    @Autowired
    private OssUtil ossUtil;

    private Long requireUserId(HttpServletRequest request) {
        Object attr = request.getAttribute("userId");
        if (!(attr instanceof Long)) {
            return null;
        }
        return (Long)attr;
    }

    @PostMapping(value={"/upload/avatar"})
    public results uploadAvatar(@RequestParam(value="file") MultipartFile file, HttpServletRequest request) {
        try {
            Long userId = this.requireUserId(request);
            if (userId == null) {
                return results.error("\u672a\u767b\u5f55\u6216\u4ee4\u724c\u65e0\u6548\uff0c\u8bf7\u5148\u767b\u5f55");
            }
            if (file == null || file.isEmpty()) {
                return results.error("\u8bf7\u9009\u62e9\u8981\u4e0a\u4f20\u7684\u6587\u4ef6");
            }
            String contentType = file.getContentType();
            if (contentType == null || !contentType.startsWith("image/")) {
                return results.error("\u53ea\u80fd\u4e0a\u4f20\u56fe\u7247\u6587\u4ef6");
            }
            long maxSize = 0x500000L;
            if (file.getSize() > maxSize) {
                return results.error("\u6587\u4ef6\u5927\u5c0f\u4e0d\u80fd\u8d85\u8fc75MB");
            }
            log.info("[upload] userId={} action=avatar name={} size={}", new Object[]{userId, file.getOriginalFilename(), file.getSize()});
            String fileUrl = this.ossUtil.uploadAvatar(file);
            HashMap<String, Object> data = new HashMap<String, Object>();
            data.put("url", fileUrl);
            data.put("originalName", file.getOriginalFilename());
            data.put("size", file.getSize());
            data.put("contentType", contentType);
            data.put("userId", userId);
            return results.success("\u5934\u50cf\u4e0a\u4f20\u6210\u529f", data);
        }
        catch (Exception e) {
            e.printStackTrace();
            return results.error("\u5934\u50cf\u4e0a\u4f20\u5931\u8d25\uff1a" + e.getMessage());
        }
    }

    @PostMapping(value={"/upload"})
    public results uploadFile(@RequestParam(value="file") MultipartFile file, @RequestParam(value="folder", required=false) String folder, HttpServletRequest request) {
        try {
            Long userId = this.requireUserId(request);
            if (userId == null) {
                return results.error("\u672a\u767b\u5f55\u6216\u4ee4\u724c\u65e0\u6548\uff0c\u8bf7\u5148\u767b\u5f55");
            }
            if (file == null || file.isEmpty()) {
                return results.error("\u8bf7\u9009\u62e9\u8981\u4e0a\u4f20\u7684\u6587\u4ef6");
            }
            long maxSize = 0xA00000L;
            if (file.getSize() > maxSize) {
                return results.error("\u6587\u4ef6\u5927\u5c0f\u4e0d\u80fd\u8d85\u8fc710MB");
            }
            log.info("[upload] userId={} action=generic folder={} name={} size={}", new Object[]{userId, folder, file.getOriginalFilename(), file.getSize()});
            String fileUrl = this.ossUtil.uploadFile(file, folder);
            HashMap<String, Object> data = new HashMap<String, Object>();
            data.put("url", fileUrl);
            data.put("originalName", file.getOriginalFilename());
            data.put("size", file.getSize());
            data.put("contentType", file.getContentType());
            data.put("folder", folder);
            data.put("userId", userId);
            return results.success("\u6587\u4ef6\u4e0a\u4f20\u6210\u529f", data);
        }
        catch (Exception e) {
            e.printStackTrace();
            return results.error("\u6587\u4ef6\u4e0a\u4f20\u5931\u8d25\uff1a" + e.getMessage());
        }
    }

    @PostMapping(value={"/upload/article-cover"})
    public results uploadArticleCover(@RequestParam(value="file") MultipartFile file, HttpServletRequest request) {
        try {
            Long userId = this.requireUserId(request);
            if (userId == null) {
                return results.error("\u672a\u767b\u5f55\u6216\u4ee4\u724c\u65e0\u6548\uff0c\u8bf7\u5148\u767b\u5f55");
            }
            if (file == null || file.isEmpty()) {
                return results.error("\u8bf7\u9009\u62e9\u8981\u4e0a\u4f20\u7684\u56fe\u7247");
            }
            String contentType = file.getContentType();
            if (contentType == null || !contentType.startsWith("image/")) {
                return results.error("\u53ea\u80fd\u4e0a\u4f20\u56fe\u7247\u6587\u4ef6");
            }
            long maxSize = 0x500000L;
            if (file.getSize() > maxSize) {
                return results.error("\u56fe\u7247\u5927\u5c0f\u4e0d\u80fd\u8d85\u8fc75MB");
            }
            log.info("[upload] userId={} action=article-cover name={} size={}", new Object[]{userId, file.getOriginalFilename(), file.getSize()});
            String fileUrl = this.ossUtil.uploadFile(file, "articles");
            HashMap<String, Object> data = new HashMap<String, Object>();
            data.put("url", fileUrl);
            data.put("originalName", file.getOriginalFilename());
            data.put("size", file.getSize());
            data.put("contentType", contentType);
            data.put("userId", userId);
            return results.success("\u5c01\u9762\u56fe\u7247\u4e0a\u4f20\u6210\u529f", data);
        }
        catch (Exception e) {
            e.printStackTrace();
            return results.error("\u5c01\u9762\u56fe\u7247\u4e0a\u4f20\u5931\u8d25\uff1a" + e.getMessage());
        }
    }

    @PostMapping(value={"/upload/article-content"})
    public results uploadArticleContentImage(@RequestParam(value="file") MultipartFile file, HttpServletRequest request) {
        try {
            Long userId = this.requireUserId(request);
            if (userId == null) {
                return results.error("\u672a\u767b\u5f55\u6216\u4ee4\u724c\u65e0\u6548\uff0c\u8bf7\u5148\u767b\u5f55");
            }
            if (file == null || file.isEmpty()) {
                return results.error("\u8bf7\u9009\u62e9\u8981\u4e0a\u4f20\u7684\u56fe\u7247");
            }
            String contentType = file.getContentType();
            if (contentType == null || !contentType.startsWith("image/")) {
                return results.error("\u53ea\u80fd\u4e0a\u4f20\u56fe\u7247\u6587\u4ef6");
            }
            long maxSize = 0x500000L;
            if (file.getSize() > maxSize) {
                return results.error("\u56fe\u7247\u5927\u5c0f\u4e0d\u80fd\u8d85\u8fc75MB");
            }
            log.info("[upload] userId={} action=article-content name={} size={}", new Object[]{userId, file.getOriginalFilename(), file.getSize()});
            String fileUrl = this.ossUtil.uploadFile(file, "articles/content");
            HashMap<String, Object> data = new HashMap<String, Object>();
            data.put("url", fileUrl);
            data.put("originalName", file.getOriginalFilename());
            data.put("size", file.getSize());
            data.put("contentType", contentType);
            data.put("userId", userId);
            return results.success("\u6b63\u6587\u56fe\u7247\u4e0a\u4f20\u6210\u529f", data);
        }
        catch (Exception e) {
            e.printStackTrace();
            return results.error("\u6b63\u6587\u56fe\u7247\u4e0a\u4f20\u5931\u8d25\uff1a" + e.getMessage());
        }
    }

    @PostMapping(value={"/upload/character-move-list"})
    public results uploadCharacterMoveList(@RequestParam(value="file") MultipartFile file, HttpServletRequest request) {
        try {
            Long userId = this.requireUserId(request);
            if (userId == null) {
                return results.error("\u672a\u767b\u5f55\u6216\u4ee4\u724c\u65e0\u6548\uff0c\u8bf7\u5148\u767b\u5f55");
            }
            if (file == null || file.isEmpty()) {
                return results.error("\u8bf7\u9009\u62e9\u8981\u4e0a\u4f20\u7684\u56fe\u7247");
            }
            String contentType = file.getContentType();
            if (contentType == null || !contentType.startsWith("image/")) {
                return results.error("\u53ea\u80fd\u4e0a\u4f20\u56fe\u7247\u6587\u4ef6");
            }
            long maxSize = 0xA00000L;
            if (file.getSize() > maxSize) {
                return results.error("\u56fe\u7247\u5927\u5c0f\u4e0d\u80fd\u8d85\u8fc710MB");
            }
            log.info("[upload] userId={} action=character-move-list name={} size={}", new Object[]{userId, file.getOriginalFilename(), file.getSize()});
            String fileUrl = this.ossUtil.uploadFile(file, "characters/move-list");
            HashMap<String, Object> data = new HashMap<String, Object>();
            data.put("url", fileUrl);
            data.put("originalName", file.getOriginalFilename());
            data.put("size", file.getSize());
            data.put("contentType", contentType);
            data.put("userId", userId);
            return results.success("\u51fa\u62db\u8868\u56fe\u4e0a\u4f20\u6210\u529f", data);
        }
        catch (Exception e) {
            e.printStackTrace();
            return results.error("\u51fa\u62db\u8868\u56fe\u4e0a\u4f20\u5931\u8d25\uff1a" + e.getMessage());
        }
    }

    @PostMapping(value={"/upload/combo-file"})
    public results uploadComboFile(@RequestParam(value="file") MultipartFile file, HttpServletRequest request) {
        try {
            Long userId = this.requireUserId(request);
            if (userId == null) {
                return results.error("\u672a\u767b\u5f55\u6216\u4ee4\u724c\u65e0\u6548\uff0c\u8bf7\u5148\u767b\u5f55");
            }
            if (file == null || file.isEmpty()) {
                return results.error("\u8bf7\u9009\u62e9\u8981\u4e0a\u4f20\u7684\u8fde\u6bb5\u6587\u4ef6");
            }
            String name = file.getOriginalFilename();
            if (name == null || !name.toLowerCase().endsWith(".tfhc")) {
                return results.error("\u4ec5\u652f\u6301 .tfhc \u8fde\u6bb5\u6587\u4ef6");
            }
            long maxSize = 0x1400000L;
            if (file.getSize() > maxSize) {
                return results.error("\u6587\u4ef6\u5927\u5c0f\u4e0d\u80fd\u8d85\u8fc720MB");
            }
            log.info("[upload] userId={} action=combo-file name={} size={}", new Object[]{userId, file.getOriginalFilename(), file.getSize()});
            String fileUrl = this.ossUtil.uploadFile(file, "combos/files");
            HashMap<String, Object> data = new HashMap<String, Object>();
            data.put("url", fileUrl);
            data.put("originalName", file.getOriginalFilename());
            data.put("size", file.getSize());
            data.put("contentType", file.getContentType());
            data.put("userId", userId);
            return results.success("\u8fde\u6bb5\u6587\u4ef6\u4e0a\u4f20\u6210\u529f", data);
        }
        catch (Exception e) {
            e.printStackTrace();
            return results.error("\u8fde\u6bb5\u6587\u4ef6\u4e0a\u4f20\u5931\u8d25\uff1a" + e.getMessage());
        }
    }

    @PostMapping(value={"/upload/combo-video"})
    public results uploadComboVideo(@RequestParam(value="file") MultipartFile file, HttpServletRequest request) {
        try {
            boolean octetOk;
            Long userId = this.requireUserId(request);
            if (userId == null) {
                return results.error("\u672a\u767b\u5f55\u6216\u4ee4\u724c\u65e0\u6548\uff0c\u8bf7\u5148\u767b\u5f55");
            }
            if (file == null || file.isEmpty()) {
                return results.error("\u8bf7\u9009\u62e9\u8981\u4e0a\u4f20\u7684\u89c6\u9891");
            }
            String contentType = file.getContentType();
            String originalName = file.getOriginalFilename() != null ? file.getOriginalFilename().toLowerCase() : "";
            boolean looksVideoExt = originalName.endsWith(".mp4") || originalName.endsWith(".webm") || originalName.endsWith(".mov") || originalName.endsWith(".mkv") || originalName.endsWith(".avi") || originalName.endsWith(".m4v");
            boolean typeOk = contentType != null && contentType.startsWith("video/");
            boolean bl = octetOk = contentType != null && contentType.equals("application/octet-stream") && looksVideoExt;
            if (!(typeOk || octetOk || looksVideoExt)) {
                return results.error("\u53ea\u80fd\u4e0a\u4f20\u89c6\u9891\u6587\u4ef6");
            }
            long maxSize = 0x6400000L;
            if (file.getSize() > maxSize) {
                return results.error("\u89c6\u9891\u5927\u5c0f\u4e0d\u80fd\u8d85\u8fc7100MB");
            }
            log.info("[upload] userId={} action=combo-video name={} size={}", new Object[]{userId, file.getOriginalFilename(), file.getSize()});
            String fileUrl = this.ossUtil.uploadFile(file, "combos/videos");
            HashMap<String, Object> data = new HashMap<String, Object>();
            data.put("url", fileUrl);
            data.put("originalName", file.getOriginalFilename());
            data.put("size", file.getSize());
            data.put("contentType", contentType);
            data.put("userId", userId);
            return results.success("\u8fde\u6bb5\u89c6\u9891\u4e0a\u4f20\u6210\u529f", data);
        }
        catch (Exception e) {
            e.printStackTrace();
            return results.error("\u8fde\u6bb5\u89c6\u9891\u4e0a\u4f20\u5931\u8d25\uff1a" + e.getMessage());
        }
    }

    @DeleteMapping(value={"/delete"})
    public results deleteFile(@RequestParam(value="url") String url, HttpServletRequest request) {
        try {
            Long userId = this.requireUserId(request);
            if (userId == null) {
                return results.error("\u672a\u767b\u5f55\u6216\u4ee4\u724c\u65e0\u6548\uff0c\u8bf7\u5148\u767b\u5f55");
            }
            if (url == null || url.isEmpty()) {
                return results.error("\u6587\u4ef6URL\u4e0d\u80fd\u4e3a\u7a7a");
            }
            String objectKey = this.ossUtil.extractObjectKeyFromUrl(url);
            if (objectKey == null) {
                return results.error("\u65e0\u6548\u7684\u6587\u4ef6URL");
            }
            log.info("[upload] userId={} action=delete url={}", (Object)userId, (Object)url);
            boolean success = this.ossUtil.deleteFile(objectKey);
            if (success) {
                return results.success("\u6587\u4ef6\u5220\u9664\u6210\u529f", null);
            }
            return results.error("\u6587\u4ef6\u5220\u9664\u5931\u8d25");
        }
        catch (Exception e) {
            e.printStackTrace();
            return results.error("\u6587\u4ef6\u5220\u9664\u5931\u8d25\uff1a" + e.getMessage());
        }
    }
}
