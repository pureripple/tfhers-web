package com.example.util;

import com.aliyun.oss.OSS;
import com.aliyun.oss.model.ListObjectsRequest;
import com.aliyun.oss.model.OSSObjectSummary;
import com.aliyun.oss.model.ObjectListing;
import com.aliyun.oss.model.ObjectMetadata;
import com.aliyun.oss.model.PutObjectRequest;
import com.example.config.OssConfig;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.UUID;

/**
 * 阿里云 OSS 工具类
 */
@Component
public class OssUtil {

    @Autowired
    private OSS ossClient;

    @Autowired
    private OssConfig ossConfig;

    public String uploadFile(MultipartFile file, String folder) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("文件不能为空");
        }

        String originalFilename = file.getOriginalFilename();
        String extension = "";
        if (originalFilename != null && originalFilename.contains(".")) {
            extension = originalFilename.substring(originalFilename.lastIndexOf("."));
        }

        String fileName = generateFileName(extension);

        String objectKey;
        if (folder != null && !folder.isEmpty()) {
            String f = folder.replaceAll("^/+|/+$", "");
            objectKey = f + "/" + fileName;
        } else {
            objectKey = fileName;
        }

        try (InputStream inputStream = file.getInputStream()) {
            PutObjectRequest putObjectRequest = new PutObjectRequest(
                    ossConfig.getBucketName(),
                    objectKey,
                    inputStream
            );
            ossClient.putObject(putObjectRequest);
            return ossConfig.getDomain() + "/" + objectKey;
        } catch (Exception e) {
            throw new IOException("文件上传失败：" + e.getMessage(), e);
        }
    }

    public String uploadStream(InputStream inputStream, String objectKey, String contentType) throws IOException {
        if (inputStream == null) {
            throw new IllegalArgumentException("inputStream 不能为空");
        }
        if (objectKey == null || objectKey.isBlank()) {
            throw new IllegalArgumentException("objectKey 不能为空");
        }
        try {
            ObjectMetadata meta = new ObjectMetadata();
            if (contentType != null && !contentType.isBlank()) {
                meta.setContentType(contentType);
            }
            PutObjectRequest req = new PutObjectRequest(
                    ossConfig.getBucketName(),
                    objectKey,
                    inputStream,
                    meta
            );
            ossClient.putObject(req);
            return ossConfig.getDomain() + "/" + objectKey;
        } catch (Exception e) {
            throw new IOException("上传输入流失败：" + e.getMessage(), e);
        }
    }

    public boolean exists(String objectKey) {
        try {
            if (objectKey == null || objectKey.isBlank()) return false;
            return ossClient.doesObjectExist(ossConfig.getBucketName(), objectKey);
        } catch (Exception e) {
            return false;
        }
    }

    public String buildUrl(String objectKey) {
        if (objectKey == null || objectKey.isBlank()) return null;
        return ossConfig.getDomain() + "/" + objectKey;
    }

    public String uploadFile(MultipartFile file) throws IOException {
        return uploadFile(file, null);
    }

    public String uploadAvatar(MultipartFile file) throws IOException {
        return uploadFile(file, "avatars");
    }

    public boolean deleteFile(String objectKey) {
        try {
            if (objectKey == null || objectKey.isBlank()) {
                return false;
            }
            // 规范化双斜杠
            String key = objectKey.replaceAll("/{2,}", "/");
            if (key.startsWith("/")) {
                key = key.substring(1);
            }
            ossClient.deleteObject(ossConfig.getBucketName(), key);
            // 兼容历史 avatars//xxx
            if (!key.equals(objectKey) && objectKey.contains("//")) {
                try {
                    ossClient.deleteObject(ossConfig.getBucketName(), objectKey);
                } catch (Exception ignored) {
                }
            }
            return true;
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }

    /**
     * 若 URL 属于本 bucket 域名则删除对应对象；非本站 URL 忽略。
     */
    public boolean deleteByUrlIfOwned(String url) {
        String key = extractObjectKeyFromUrl(url);
        if (key == null) {
            return false;
        }
        return deleteFile(key);
    }

    public String extractObjectKeyFromUrl(String url) {
        if (url == null || url.isBlank()) {
            return null;
        }
        String domain = ossConfig.getDomain();
        if (domain == null || !url.startsWith(domain)) {
            return null;
        }
        String key = url.substring(domain.length());
        if (key.startsWith("/")) {
            key = key.substring(1);
        }
        if (key.isBlank()) {
            return null;
        }
        return key;
    }

    /**
     * 列出指定前缀下的对象（最多 maxKeys，分页直到拿完或达到 hardCap）。
     */
    public List<OssObjectInfo> listObjects(String prefix, int hardCap) {
        List<OssObjectInfo> out = new ArrayList<>();
        String marker = null;
        int safety = 0;
        try {
            do {
                ListObjectsRequest req = new ListObjectsRequest(ossConfig.getBucketName());
                if (prefix != null && !prefix.isBlank()) {
                    req.setPrefix(prefix);
                }
                req.setMaxKeys(Math.min(1000, Math.max(1, hardCap - out.size())));
                if (marker != null) {
                    req.setMarker(marker);
                }
                ObjectListing listing = ossClient.listObjects(req);
                for (OSSObjectSummary s : listing.getObjectSummaries()) {
                    if (s == null || s.getKey() == null || s.getKey().endsWith("/")) {
                        continue;
                    }
                    OssObjectInfo info = new OssObjectInfo();
                    info.setKey(s.getKey());
                    info.setSize(s.getSize());
                    Date lm = s.getLastModified();
                    info.setLastModified(lm != null ? lm.toInstant() : null);
                    out.add(info);
                    if (out.size() >= hardCap) {
                        return out;
                    }
                }
                marker = listing.isTruncated() ? listing.getNextMarker() : null;
                safety++;
            } while (marker != null && safety < 200);
        } catch (Exception e) {
            throw new RuntimeException("列举 OSS 对象失败：" + e.getMessage(), e);
        }
        return out;
    }

    public String getDomain() {
        return ossConfig.getDomain();
    }

    public String getBucketName() {
        return ossConfig.getBucketName();
    }

    private String generateFileName(String extension) {
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
        String uuid = UUID.randomUUID().toString().replace("-", "").substring(0, 8);
        return timestamp + "_" + uuid + extension;
    }

    public static class OssObjectInfo {
        private String key;
        private long size;
        private Instant lastModified;

        public String getKey() { return key; }
        public void setKey(String key) { this.key = key; }
        public long getSize() { return size; }
        public void setSize(long size) { this.size = size; }
        public Instant getLastModified() { return lastModified; }
        public void setLastModified(Instant lastModified) { this.lastModified = lastModified; }
    }
}
