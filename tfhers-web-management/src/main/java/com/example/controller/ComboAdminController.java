package com.example.controller;

import com.example.pojo.Combo;
import com.example.pojo.results;
import com.example.service.ComboService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/combos")
public class ComboAdminController {

    @Autowired
    private ComboService comboService;

    /**
     * 用户连段列表（审核用），可选 status: pending / approved / rejected，不传则全部
     */
    @GetMapping("/list")
    public results listCombos(@RequestParam(value = "status", required = false) String status) {
        try {
            java.util.List<Combo> list = comboService.listByStatus(status);
            return results.success("获取成功", list);
        } catch (Exception e) {
            e.printStackTrace();
            return results.error("获取连段列表失败：" + e.getMessage());
        }
    }

    /**
     * 修改连段状态（审核：通过/拒绝）
     */
    @PutMapping("/{id}/status")
    public results updateComboStatus(@PathVariable Long id, @RequestBody StatusRequest request) {
        try {
            Combo existing = comboService.getComboById(id);
            if (existing == null) {
                return results.error("连段不存在");
            }

            String status = request.getStatus();
            if (status == null || status.isEmpty()) {
                return results.error("状态不能为空");
            }
            if (!"pending".equals(status) && !"approved".equals(status) && !"rejected".equals(status)) {
                return results.error("无效的状态值");
            }

            boolean success = comboService.updateComboStatus(id, status);
            if (success) {
                return results.success("更新连段状态成功", null);
            } else {
                return results.error("更新连段状态失败");
            }
        } catch (Exception e) {
            e.printStackTrace();
            return results.error("更新连段状态失败：" + e.getMessage());
        }
    }

    /**
     * 删除连段
     */
    @DeleteMapping("/{id}")
    public results deleteCombo(@PathVariable Long id) {
        try {
            Combo existing = comboService.getComboById(id);
            if (existing == null) {
                return results.error("连段不存在");
            }

            boolean success = comboService.deleteCombo(id);
            if (success) {
                return results.success("删除连段成功", null);
            } else {
                return results.error("删除连段失败");
            }
        } catch (Exception e) {
            e.printStackTrace();
            return results.error("删除连段失败：" + e.getMessage());
        }
    }

    public static class StatusRequest {
        private String status;

        public String getStatus() {
            return status;
        }

        public void setStatus(String status) {
            this.status = status;
        }
    }
}

