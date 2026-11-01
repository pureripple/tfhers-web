package com.example.controller;

import com.example.pojo.Move;
import com.example.pojo.results;
import com.example.service.MoveService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/moves")
public class MoveAdminController {

    @Autowired
    private MoveService moveService;

    /**
     * 修改招式
     */
    @PutMapping("/{id}")
    public results updateMove(@PathVariable Long id, @RequestBody UpdateMoveRequest request) {
        try {
            Move existing = moveService.getMoveById(id);
            if (existing == null) {
                return results.error("招式不存在");
            }

            if (request.getNameZh() != null) {
                existing.setNameZh(request.getNameZh().trim());
            }
            if (request.getNameEn() != null) {
                existing.setNameEn(request.getNameEn());
            }
            if (request.getInputCommand() != null) {
                existing.setInputCommand(request.getInputCommand().trim());
            }
            if (request.getDescription() != null) {
                existing.setDescription(request.getDescription());
            }
            if (request.getMotionImageUrl() != null) {
                existing.setMotionImageUrl(request.getMotionImageUrl());
            }
            if (request.getOrderIndex() != null) {
                existing.setOrderIndex(request.getOrderIndex());
            }

            boolean success = moveService.updateMove(existing);
            if (success) {
                return results.success("更新招式成功", existing);
            } else {
                return results.error("更新招式失败");
            }
        } catch (Exception e) {
            e.printStackTrace();
            return results.error("更新招式失败：" + e.getMessage());
        }
    }

    /**
     * 删除招式
     */
    @DeleteMapping("/{id}")
    public results deleteMove(@PathVariable Long id) {
        try {
            Move existing = moveService.getMoveById(id);
            if (existing == null) {
                return results.error("招式不存在");
            }

            boolean success = moveService.deleteMove(id);
            if (success) {
                return results.success("删除招式成功", null);
            } else {
                return results.error("删除招式失败");
            }
        } catch (Exception e) {
            e.printStackTrace();
            return results.error("删除招式失败：" + e.getMessage());
        }
    }

    public static class UpdateMoveRequest {
        private String nameZh;
        private String nameEn;
        private String inputCommand;
        private String description;
        private String motionImageUrl;
        private Integer orderIndex;

        public String getNameZh() {
            return nameZh;
        }

        public void setNameZh(String nameZh) {
            this.nameZh = nameZh;
        }

        public String getNameEn() {
            return nameEn;
        }

        public void setNameEn(String nameEn) {
            this.nameEn = nameEn;
        }

        public String getInputCommand() {
            return inputCommand;
        }

        public void setInputCommand(String inputCommand) {
            this.inputCommand = inputCommand;
        }

        public String getDescription() {
            return description;
        }

        public void setDescription(String description) {
            this.description = description;
        }

        public String getMotionImageUrl() {
            return motionImageUrl;
        }

        public void setMotionImageUrl(String motionImageUrl) {
            this.motionImageUrl = motionImageUrl;
        }

        public Integer getOrderIndex() {
            return orderIndex;
        }

        public void setOrderIndex(Integer orderIndex) {
            this.orderIndex = orderIndex;
        }
    }
}

