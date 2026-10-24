# 双败淘汰（P3）说明

## 赛制字段
- `tournaments.bracket_type`: `single` | `double`
  - Flyway V5 默认 `single`（兼容旧数据）
  - 管理端新建默认 `double`
- `tournament_matches.bracket_side`: `single` | `winners` | `losers` | `grand_final`
- `loser_next_match_id` / `loser_next_slot`: 胜者组败者掉入败者组的目标
- `is_reset_match`: `1` 表示总决赛重置场（GF2）
- 唯一键改为 `(tournament_id, bracket_side, round, match_index)`

## 结构（8 / 16）
- 胜者组：与单败相同（N-1 场）
- 败者组：2*log2(N)-2 轮；WB R1 败者进入 LB R1；之后 WB 各轮败者落入 LB 偶数轮
- 总决赛：GF1（胜者组冠军=player1 vs 败者组冠军=player2）
  - 若胜者组冠军赢 GF1 → 完赛（无需重置）
  - 若败者组冠军赢 GF1 → 打 GF2（重置决赛；胜者组冠军至此仍只有 1 败）

实现类：`DoubleElimBracketFactory`（接线规则，仅 8/16）

## 名次（finalizePlacementsDouble）
- 决胜总决赛胜者=1，负者=2（若打了 GF2 以 GF2 为准）
- 败者组决赛负者=3
- 更早在败者组出局：按 LB 轮次共享名次（越早出局名次越差）
- 胜者组失利本身不定名次（掉入败者组继续）

## 对阵生成与签到
- 生成对阵时纳入**全部已报名**选手，不按签到过滤；未到场由主办方处理。

## 已知限制
- 双败 + 轮空时，败者组对应槽位可能缺人（建议尽量凑满 8/16 签）
- 暂不支持中途改赛制后自动迁移已有对阵（需重新生成）
