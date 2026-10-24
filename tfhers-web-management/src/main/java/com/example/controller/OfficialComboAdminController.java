package com.example.controller;

import com.example.pojo.OfficialCombo;
import com.example.pojo.results;
import com.example.service.OfficialComboService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
@CrossOrigin(origins = "*")
public class OfficialComboAdminController {

    @Autowired
    private OfficialComboService officialComboService;

    /**
     * 获取某角色的官方连段列表
     */
    @GetMapping("/characters/{characterId}/official-combos")
    public results getOfficialCombosByCharacter(@PathVariable Long characterId) {
        try {
            List<OfficialCombo> combos = officialComboService.getByCharacterId(characterId);
            return results.success("获取官方连段列表成功", combos);
        } catch (Exception e) {
            e.printStackTrace();
            return results.error("获取官方连段列表失败：" + e.getMessage());
        }
    }

    /**
     * 新增官方连段
     */
    @PostMapping("/characters/{characterId}/official-combos")
    public results createOfficialCombo(@PathVariable Long characterId,
                                       @RequestBody OfficialComboRequest request) {
        try {
            if (request.getTitle() == null || request.getTitle().trim().isEmpty()) {
                return results.error("标题不能为空");
            }
            if (request.getVideoUrl() == null || request.getVideoUrl().trim().isEmpty()) {
                return results.error("视频地址不能为空");
            }

            OfficialCombo combo = new OfficialCombo();
            combo.setCharacterId(characterId);
            combo.setTitle(request.getTitle().trim());
            combo.setDescription(request.getDescription());
            combo.setVideoUrl(request.getVideoUrl().trim());
            combo.setOrderIndex(request.getOrderIndex());

            boolean success = officialComboService.create(combo);
            if (success) {
                return results.success("新增官方连段成功", combo);
            } else {
                return results.error("新增官方连段失败");
            }
        } catch (Exception e) {
            e.printStackTrace();
            return results.error("新增官方连段失败：" + e.getMessage());
        }
    }

    /**
     * 更新官方连段
     */
    @PutMapping("/official-combos/{id}")
    public results updateOfficialCombo(@PathVariable Long id,
                                       @RequestBody OfficialComboRequest request) {
        try {
            OfficialCombo existing = officialComboService.getById(id);
            if (existing == null) {
                return results.error("官方连段不存在");
            }

            if (request.getTitle() != null) {
                existing.setTitle(request.getTitle().trim());
            }
            if (request.getDescription() != null) {
                existing.setDescription(request.getDescription());
            }
            if (request.getVideoUrl() != null) {
                existing.setVideoUrl(request.getVideoUrl().trim());
            }
            if (request.getOrderIndex() != null) {
                existing.setOrderIndex(request.getOrderIndex());
            }

            boolean success = officialComboService.update(existing);
            if (success) {
                return results.success("更新官方连段成功", existing);
            } else {
                return results.error("更新官方连段失败");
            }
        } catch (Exception e) {
            e.printStackTrace();
            return results.error("更新官方连段失败：" + e.getMessage());
        }
    }

    /**
     * 删除官方连段
     */
    @DeleteMapping("/official-combos/{id}")
    public results deleteOfficialCombo(@PathVariable Long id) {
        try {
            OfficialCombo existing = officialComboService.getById(id);
            if (existing == null) {
                return results.error("官方连段不存在");
            }

            boolean success = officialComboService.delete(id);
            if (success) {
                return results.success("删除官方连段成功", null);
            } else {
                return results.error("删除官方连段失败");
            }
        } catch (Exception e) {
            e.printStackTrace();
            return results.error("删除官方连段失败：" + e.getMessage());
        }
    }

    public static class OfficialComboRequest {
        private String title;
        private String description;
        private String videoUrl;
        private Integer orderIndex;

        public String getTitle() {
            return title;
        }

        public void setTitle(String title) {
            this.title = title;
        }

        public String getDescription() {
            return description;
        }

        public void setDescription(String description) {
            this.description = description;
        }

        public String getVideoUrl() {
            return videoUrl;
        }

        public void setVideoUrl(String videoUrl) {
            this.videoUrl = videoUrl;
        }

        public Integer getOrderIndex() {
            return orderIndex;
        }

        public void setOrderIndex(Integer orderIndex) {
            this.orderIndex = orderIndex;
        }
    }
}

