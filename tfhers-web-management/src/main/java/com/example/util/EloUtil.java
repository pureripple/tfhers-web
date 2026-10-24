package com.example.util;

/**
 * 站点 Elo 段位分工具。
 *
 * <h3>基础 Elo（段位差距模型）</h3>
 * <pre>
 *   expected = 1 / (1 + 10^((opponent - me) / 400))
 *   actual   = 见 {@link #actualScore}（默认胜=1 / 负=0；有比分时按局分占比）
 *   delta    = K * (actual - expected)
 *   new      = round(rating + delta)  // 可为负，无托底
 * </pre>
 * 强者对弱者时，预期结果下加减分本来就很小；「爆冷」加减分放大——
 * 这来自段位差距本身。
 *
 * <h3>比分细调（局分占比）</h3>
 * 录分后有 score1/score2 时：
 * <pre>
 *   actual = myGames / (myGames + oppGames)
 *   例 BO3：2-0 → 胜方 1.0 / 负方 0.0
 *           2-1 → 胜方 ≈0.667 / 负方 ≈0.333（虽败犹荣，负方少扣甚至可加）
 * </pre>
 * 无有效比分时回退为纯胜负 1/0，兼容旧数据。
 * 额外规则：{@link #WIN_FLOOR_ZERO} —— 拿下整场比赛时 delta 不会为负
 * （强者 2-1 险胜弱者时，按占比可能算出负分，地板抬到 0，避免「赢了还掉分」）。
 *
 * <h3>段位（展示 D～S）</h3>
 * <ul>
 *   <li>D: rating &lt; 1000</li>
 *   <li>C: 1000–1199</li>
 *   <li>B: 1200–1399</li>
 *   <li>A: 1400–1599</li>
 *   <li>S: 1600+</li>
 * </ul>
 *
 * <h3>K 因子（低分段变动大、高分段变动小）</h3>
 * &lt;1200 → 40；&lt;1600 → 32；&lt;2000 → 24；否则 → 16
 *
 * <h3>例子：C=1100 vs S=1700</h3>
 * <ul>
 *   <li>C 期望胜率 ≈ 3.1%（K=40）；S 期望胜率 ≈ 96.9%（K=24）</li>
 *   <li>S 以 2-0 胜：S 约 +1、C 约 −1（贴预期）</li>
 *   <li>S 以 2-1 胜：C 实际≈0.333 → C 约 +12（吃下一局虽败犹荣）；S 占比算出可能为负 → 地板 0</li>
 *   <li>C 以 2-0 爆冷：C 约 +39、S 约 −23</li>
 *   <li>C 以 2-1 爆冷：C 约 +25、S 约 −15（比 2-0 摆幅略小）</li>
 * </ul>
 *
 * <h3>防刷分/炸分（可选上限）</h3>
 * 当胜方期望胜率 ≥ {@link #FARM_EXPECTED_THRESHOLD}（碾压）时，
 * 胜方本场加分上限为 {@link #FARM_MAX_GAIN}；负方扣分仍按正常 Elo（本来就很小）。
 */
public final class EloUtil {

    public static final int DEFAULT_RATING = 1000;

    /** 碾压局：期望胜率达到此值视为「炸分」。 */
    public static final double FARM_EXPECTED_THRESHOLD = 0.85;

    /** 炸分时胜方加分上限（不影响负方按 Elo 扣得很少）。 */
    public static final int FARM_MAX_GAIN = 2;

    /**
     * 整场获胜时，若按局分占比算出的 delta &lt; 0，则抬到 0。
     * 避免强者险胜弱者「赢了还掉分」；负方仍可因虽败犹荣少扣/加分。
     */
    public static final boolean WIN_FLOOR_ZERO = true;

    private EloUtil() {}

    public static int kFactor(int rating) {
        if (rating < 1200) return 40;
        if (rating < 1600) return 32;
        if (rating < 2000) return 24;
        return 16;
    }

    /** 期望胜率：ratingA 对 ratingB */
    public static double expectedScore(int ratingA, int ratingB) {
        return 1.0 / (1.0 + Math.pow(10.0, (ratingB - ratingA) / 400.0));
    }

    /**
     * 本场「实际得分」用于 Elo。
     * <ul>
     *   <li>有有效非负比分且总局数 &gt; 0：局分占比 my/(my+opp)</li>
     *   <li>否则：胜=1.0，负=0.0</li>
     * </ul>
     */
    public static double actualScore(boolean won, Integer myScore, Integer oppScore) {
        if (myScore != null && oppScore != null && myScore >= 0 && oppScore >= 0) {
            int total = myScore + oppScore;
            if (total > 0) {
                return myScore / (double) total;
            }
        }
        return won ? 1.0 : 0.0;
    }

    /**
     * 计算积分变动（仅胜负，无比分）。保留给测试与旧调用。
     */
    public static int computeDelta(int rating, int opponentRating, boolean won) {
        return computeDelta(rating, opponentRating, won, null, null);
    }

    /**
     * 计算积分变动：段位差距 Elo + 可选比分细调。
     *
     * @param rating         自己当前分
     * @param opponentRating 对方当前分
     * @param won            是否整场获胜
     * @param myScore        己方小局分（可为 null）
     * @param oppScore       对方小局分（可为 null）
     */
    public static int computeDelta(int rating, int opponentRating, boolean won,
                                   Integer myScore, Integer oppScore) {
        double expected = expectedScore(rating, opponentRating);
        double actual = actualScore(won, myScore, oppScore);
        int k = kFactor(rating);
        int raw = (int) Math.round(k * (actual - expected));

        // 防炸分：强者碾压预期下的胜场，限制加分
        if (won && expected >= FARM_EXPECTED_THRESHOLD && raw > FARM_MAX_GAIN) {
            raw = FARM_MAX_GAIN;
        }
        // 整场赢了不掉分（险胜弱者时占比可能 &lt; expected）
        if (WIN_FLOOR_ZERO && won && raw < 0) {
            raw = 0;
        }
        return raw;
    }

    /** 计算更新后积分（仅胜负）。 */
    public static int computeNewRating(int rating, int opponentRating, boolean won) {
        return computeNewRating(rating, opponentRating, won, null, null);
    }

    /** 计算更新后积分（含比分细调）。 */
    public static int computeNewRating(int rating, int opponentRating, boolean won,
                                       Integer myScore, Integer oppScore) {
        // 允许负数：方便「反向上分」；悬殊对局下扣分趋近 0（四舍五入后常为 0）
        return rating + computeDelta(rating, opponentRating, won, myScore, oppScore);
    }

    public static int delta(int before, int after) {
        return after - before;
    }

    public static String tierOf(int rating) {
        if (rating < 1000) return "D";
        if (rating < 1200) return "C";
        if (rating < 1400) return "B";
        if (rating < 1600) return "A";
        return "S";
    }

    public static String tierLabel(String tier) {
        if (tier == null) return "未定级";
        switch (tier) {
            case "S": return "S 级";
            case "A": return "A 级";
            case "B": return "B 级";
            case "C": return "C 级";
            case "D": return "D 级";
            default: return tier;
        }
    }
}
