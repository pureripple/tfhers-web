package com.example.controller;

import com.example.pojo.Combo;
import com.example.pojo.GameCharacter;
import com.example.pojo.Move;
import com.example.pojo.OfficialCombo;
import com.example.pojo.results;
import com.example.service.CharacterService;
import com.example.service.ComboService;
import com.example.service.OfficialComboService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 前台玩家端 - 角色教程相关接口（只读）
 */
@RestController
@RequestMapping("/api/characters")
public class CharacterPublicController {

    @Autowired
    private CharacterService characterService;

    @Autowired
    private OfficialComboService officialComboService;

    @Autowired
    private ComboService comboService;

    /**
     * 前台角色列表：用于角色选择界面
     */
    @GetMapping
    public results listCharacters() {
        try {
            List<GameCharacter> characters = characterService.getAllCharacters();
            return results.success("获取角色列表成功", characters);
        } catch (Exception e) {
            e.printStackTrace();
            return results.error("获取角色列表失败：" + e.getMessage());
        }
    }

    /**
     * 前台角色教程详情：
     * 角色信息 + 出招表 + 官方教学视频 + 官方连段 + 已审核玩家连段
     */
    @GetMapping("/{id}")
    public results getCharacterDetail(@PathVariable Long id) {
        try {
            GameCharacter character = characterService.getCharacterById(id);
            if (character == null) {
                return results.error("角色不存在");
            }

            // 出招表
            List<Move> moves = characterService.getMovesByCharacterId(id);

            // 官方连段
            List<OfficialCombo> officialCombos = officialComboService.getByCharacterId(id);

            // 玩家连段（只返回已审核通过的，带发布者头像与昵称）
            List<Combo> userCombos = comboService.getCombosByCharacterIdWithAuthor(id, "approved");

            Map<String, Object> data = new HashMap<>();
            data.put("character", character);
            data.put("moves", moves);
            data.put("officialVideoUrl", character.getOfficialVideoUrl());
            data.put("officialCombos", officialCombos);
            data.put("userCombos", userCombos);

            return results.success("获取角色教程详情成功", data);
        } catch (Exception e) {
            e.printStackTrace();
            return results.error("获取角色教程详情失败：" + e.getMessage());
        }
    }
}

