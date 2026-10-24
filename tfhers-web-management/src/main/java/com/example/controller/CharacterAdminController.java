package com.example.controller;

import com.example.pojo.Combo;
import com.example.pojo.GameCharacter;
import com.example.pojo.Move;
import com.example.pojo.results;
import com.example.service.CharacterService;
import com.example.service.ComboService;
import com.example.service.MoveService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/characters")
@CrossOrigin(origins = "*")
public class CharacterAdminController {

    @Autowired
    private CharacterService characterService;

    @Autowired
    private MoveService moveService;

    @Autowired
    private ComboService comboService;

    /**
     * 获取全部角色列表（无查询条件）
     */
    @GetMapping
    public results getAllCharacters() {
        try {
            List<GameCharacter> characters = characterService.getAllCharacters();
            return results.success("获取角色列表成功", characters);
        } catch (Exception e) {
            e.printStackTrace();
            return results.error("获取角色列表失败：" + e.getMessage());
        }
    }

    /**
     * 创建角色
     */
    @PostMapping
    public results createCharacter(@RequestBody CreateCharacterRequest request) {
        try {
            if (request.getNameEn() == null || request.getNameEn().trim().isEmpty()) {
                return results.error("英文名称不能为空");
            }
            if (request.getNameZh() == null || request.getNameZh().trim().isEmpty()) {
                return results.error("中文名称不能为空");
            }

            GameCharacter character = new GameCharacter();
            character.setNameEn(request.getNameEn().trim());
            character.setNameZh(request.getNameZh().trim());
            character.setAvatarUrl(request.getAvatarUrl());
            character.setIntro(request.getIntro());
            character.setBackground(request.getBackground());
            character.setDifficultyLevel(request.getDifficultyLevel());
            character.setOfficialVideoUrl(request.getOfficialVideoUrl());
            character.setMoveListImageUrl(request.getMoveListImageUrl());

            boolean success = characterService.createCharacter(character);
            if (success) {
                return results.success("创建角色成功", character);
            } else {
                return results.error("创建角色失败");
            }
        } catch (Exception e) {
            e.printStackTrace();
            return results.error("创建角色失败：" + e.getMessage());
        }
    }

    /**
     * 更新角色信息（部分字段）
     */
    @PutMapping("/{id}")
    public results updateCharacter(@PathVariable Long id, @RequestBody UpdateCharacterRequest request) {
        try {
            GameCharacter existing = characterService.getCharacterById(id);
            if (existing == null) {
                return results.error("角色不存在");
            }

            if (request.getNameEn() != null) {
                existing.setNameEn(request.getNameEn().trim());
            }
            if (request.getNameZh() != null) {
                existing.setNameZh(request.getNameZh().trim());
            }
            if (request.getAvatarUrl() != null) {
                existing.setAvatarUrl(request.getAvatarUrl());
            }
            if (request.getIntro() != null) {
                existing.setIntro(request.getIntro());
            }
            if (request.getBackground() != null) {
                existing.setBackground(request.getBackground());
            }
            if (request.getDifficultyLevel() != null) {
                existing.setDifficultyLevel(request.getDifficultyLevel());
            }
            if (request.getOfficialVideoUrl() != null) {
                existing.setOfficialVideoUrl(request.getOfficialVideoUrl());
            }
            if (request.getMoveListImageUrl() != null) {
                existing.setMoveListImageUrl(request.getMoveListImageUrl());
            }

            boolean success = characterService.updateCharacter(existing);
            if (success) {
                return results.success("更新角色成功", existing);
            } else {
                return results.error("更新角色失败");
            }
        } catch (Exception e) {
            e.printStackTrace();
            return results.error("更新角色失败：" + e.getMessage());
        }
    }

    /**
     * 删除角色（依赖数据库外键级联删除招式和连段）
     */
    @DeleteMapping("/{id}")
    public results deleteCharacter(@PathVariable Long id) {
        try {
            GameCharacter existing = characterService.getCharacterById(id);
            if (existing == null) {
                return results.error("角色不存在");
            }

            boolean success = characterService.deleteCharacter(id);
            if (success) {
                return results.success("删除角色成功", null);
            } else {
                return results.error("删除角色失败");
            }
        } catch (Exception e) {
            e.printStackTrace();
            return results.error("删除角色失败：" + e.getMessage());
        }
    }

    /**
     * 角色详情：基础信息 + 出招表 + 用户连段
     */
    @GetMapping("/{id}")
    public results getCharacterDetail(@PathVariable Long id,
                                      @RequestParam(required = false) String comboStatus) {
        try {
            GameCharacter character = characterService.getCharacterById(id);
            if (character == null) {
                return results.error("角色不存在");
            }
            List<Move> moves = characterService.getMovesByCharacterId(id);
            List<Combo> combos = characterService.getCombosByCharacterId(id, comboStatus);

            Map<String, Object> data = new HashMap<>();
            data.put("character", character);
            data.put("moves", moves);
            data.put("combos", combos);

            return results.success("获取角色详情成功", data);
        } catch (Exception e) {
            e.printStackTrace();
            return results.error("获取角色详情失败：" + e.getMessage());
        }
    }

    /**
     * 获取某个角色的全部招式
     */
    @GetMapping("/{characterId}/moves")
    public results getMovesByCharacter(@PathVariable Long characterId) {
        try {
            List<Move> moves = moveService.getMovesByCharacterId(characterId);
            return results.success("获取出招表成功", moves);
        } catch (Exception e) {
            e.printStackTrace();
            return results.error("获取出招表失败：" + e.getMessage());
        }
    }

    /**
     * 为角色新增一个招式
     */
    @PostMapping("/{characterId}/moves")
    public results createMoveForCharacter(@PathVariable Long characterId,
                                          @RequestBody MoveRequest request) {
        try {
            if (request.getNameZh() == null || request.getNameZh().trim().isEmpty()) {
                return results.error("招式中文名称不能为空");
            }
            if (request.getInputCommand() == null || request.getInputCommand().trim().isEmpty()) {
                return results.error("按键操作说明不能为空");
            }

            Move move = new Move();
            move.setCharacterId(characterId);
            move.setNameZh(request.getNameZh().trim());
            move.setNameEn(request.getNameEn());
            move.setInputCommand(request.getInputCommand().trim());
            move.setDescription(request.getDescription());
            move.setMotionImageUrl(request.getMotionImageUrl());
            move.setOrderIndex(request.getOrderIndex());

            boolean success = moveService.createMove(move);
            if (success) {
                return results.success("新增招式成功", move);
            } else {
                return results.error("新增招式失败");
            }
        } catch (Exception e) {
            e.printStackTrace();
            return results.error("新增招式失败：" + e.getMessage());
        }
    }

    /**
     * 查看某角色的用户连段（支持按状态筛选）
     */
    @GetMapping("/{characterId}/combos")
    public results getCombosByCharacter(@PathVariable Long characterId,
                                        @RequestParam(required = false) String status) {
        try {
            List<Combo> combos = comboService.getCombosByCharacterId(characterId, status);
            return results.success("获取连段列表成功", combos);
        } catch (Exception e) {
            e.printStackTrace();
            return results.error("获取连段列表失败：" + e.getMessage());
        }
    }

    // ================== 请求体 DTO ==================

    public static class CreateCharacterRequest {
        private String nameEn;
        private String nameZh;
        private String avatarUrl;
        private String intro;
        private String background;
        private Integer difficultyLevel;
        private String officialVideoUrl;
        private String moveListImageUrl;

        public String getNameEn() { return nameEn; }
        public void setNameEn(String nameEn) { this.nameEn = nameEn; }
        public String getNameZh() { return nameZh; }
        public void setNameZh(String nameZh) { this.nameZh = nameZh; }
        public String getAvatarUrl() { return avatarUrl; }
        public void setAvatarUrl(String avatarUrl) { this.avatarUrl = avatarUrl; }
        public String getIntro() { return intro; }
        public void setIntro(String intro) { this.intro = intro; }
        public String getBackground() { return background; }
        public void setBackground(String background) { this.background = background; }
        public Integer getDifficultyLevel() { return difficultyLevel; }
        public void setDifficultyLevel(Integer difficultyLevel) { this.difficultyLevel = difficultyLevel; }
        public String getOfficialVideoUrl() { return officialVideoUrl; }
        public void setOfficialVideoUrl(String officialVideoUrl) { this.officialVideoUrl = officialVideoUrl; }
        public String getMoveListImageUrl() { return moveListImageUrl; }
        public void setMoveListImageUrl(String moveListImageUrl) { this.moveListImageUrl = moveListImageUrl; }
    }

    public static class UpdateCharacterRequest {
        private String nameEn;
        private String nameZh;
        private String avatarUrl;
        private String intro;
        private String background;
        private Integer difficultyLevel;
        private String officialVideoUrl;
        private String moveListImageUrl;

        public String getNameEn() {
            return nameEn;
        }

        public void setNameEn(String nameEn) {
            this.nameEn = nameEn;
        }

        public String getNameZh() {
            return nameZh;
        }

        public void setNameZh(String nameZh) {
            this.nameZh = nameZh;
        }

        public String getAvatarUrl() {
            return avatarUrl;
        }

        public void setAvatarUrl(String avatarUrl) {
            this.avatarUrl = avatarUrl;
        }

        public String getIntro() {
            return intro;
        }

        public void setIntro(String intro) {
            this.intro = intro;
        }

        public String getBackground() {
            return background;
        }

        public void setBackground(String background) {
            this.background = background;
        }

        public Integer getDifficultyLevel() {
            return difficultyLevel;
        }

        public void setDifficultyLevel(Integer difficultyLevel) {
            this.difficultyLevel = difficultyLevel;
        }

        public String getOfficialVideoUrl() {
            return officialVideoUrl;
        }

        public void setOfficialVideoUrl(String officialVideoUrl) {
            this.officialVideoUrl = officialVideoUrl;
        }

        public String getMoveListImageUrl() {
            return moveListImageUrl;
        }

        public void setMoveListImageUrl(String moveListImageUrl) {
            this.moveListImageUrl = moveListImageUrl;
        }
    }

    public static class MoveRequest {
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

