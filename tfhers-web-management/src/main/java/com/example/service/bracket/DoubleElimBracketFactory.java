package com.example.service.bracket;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Builds double-elimination match shells for bracketSize 8 or 16.
 *
 * Key format: "{side}:{round}:{index}" where side is W|L|GF.
 *
 * Structure (standard Challonge-style):
 * - Winners: same tree as single-elim (log2(N) rounds).
 * - Losers: 2*log2(N)-2 rounds; WB round-1 losers feed LB round-1;
 *   subsequent WB losers drop into alternating LB "major" rounds;
 *   between major rounds, LB winners consolidate in "minor" rounds.
 * - Grand final: GF1 (WB champ vs LB champ). If WB champ loses GF1,
 *   GF2 reset is played (same two players). Convention: GF player1 = WB champ.
 *
 * Placement guidance (applied in service):
 * - Ultimate GF winner = 1, loser = 2
 * - LB final loser = 3
 * - Earlier LB elimination: shared place = 2^(remaining) style by LB round
 */
public final class DoubleElimBracketFactory {

    private DoubleElimBracketFactory() {}

    public static final class Shell {
        public final String key;
        public final String bracketSide; // winners | losers | grand_final
        public final int round;
        public final int matchIndex;
        public final int isResetMatch;
        public String winnerNextKey;
        public Integer winnerNextSlot;
        public String loserNextKey;
        public Integer loserNextSlot;

        Shell(String key, String side, int round, int matchIndex, int isResetMatch) {
            this.key = key;
            this.bracketSide = side;
            this.round = round;
            this.matchIndex = matchIndex;
            this.isResetMatch = isResetMatch;
        }
    }

    public static List<Shell> build(int bracketSize) {
        if (bracketSize != 8 && bracketSize != 16) {
            throw new IllegalArgumentException("double-elim only supports 8 or 16, got " + bracketSize);
        }
        Map<String, Shell> map = new LinkedHashMap<>();

        int wbRounds = log2(bracketSize);
        // create WB matches
        for (int r = 1; r <= wbRounds; r++) {
            int count = bracketSize / (1 << r);
            for (int i = 0; i < count; i++) {
                String key = key("W", r, i);
                map.put(key, new Shell(key, "winners", r, i, 0));
            }
        }
        // wire WB winner path
        for (int r = 1; r < wbRounds; r++) {
            int count = bracketSize / (1 << r);
            for (int i = 0; i < count; i++) {
                Shell s = map.get(key("W", r, i));
                s.winnerNextKey = key("W", r + 1, i / 2);
                s.winnerNextSlot = (i % 2) + 1;
            }
        }

        int lbRounds = 2 * wbRounds - 2;
        // LB match counts per round:
        // r=1: N/4
        // then alternate: same size (major/drop), then half (minor/consolidate), ...
        // For N=8: 2,2,1,1
        // For N=16: 4,4,2,2,1,1
        int[] lbCounts = lbMatchCounts(bracketSize, lbRounds);
        for (int r = 1; r <= lbRounds; r++) {
            for (int i = 0; i < lbCounts[r - 1]; i++) {
                String k = key("L", r, i);
                map.put(k, new Shell(k, "losers", r, i, 0));
            }
        }
        // wire LB winner path: each round feeds next
        for (int r = 1; r < lbRounds; r++) {
            int count = lbCounts[r - 1];
            int nextCount = lbCounts[r];
            boolean consolidating = nextCount < count; // winners play each other
            for (int i = 0; i < count; i++) {
                Shell s = map.get(key("L", r, i));
                if (consolidating) {
                    s.winnerNextKey = key("L", r + 1, i / 2);
                    s.winnerNextSlot = (i % 2) + 1;
                } else {
                    // same size: winner stays in same index, slot 1 (slot 2 filled by WB drop)
                    s.winnerNextKey = key("L", r + 1, i);
                    s.winnerNextSlot = 1;
                }
            }
        }

        // WB losers drop into LB
        // WB R1 losers → LB R1 (pair consecutive)
        int wbR1 = bracketSize / 2;
        for (int i = 0; i < wbR1; i++) {
            Shell s = map.get(key("W", 1, i));
            s.loserNextKey = key("L", 1, i / 2);
            s.loserNextSlot = (i % 2) + 1;
        }
        // Subsequent WB rounds drop into LB "major" rounds: LB rounds 2,4,6...
        // WB round r (r>=2) has bracketSize/2^r matches; drops into LB round (2*(r-1))
        for (int wr = 2; wr <= wbRounds; wr++) {
            int lbRound = 2 * (wr - 1); // 2,4,6...
            int wbCount = bracketSize / (1 << wr);
            for (int i = 0; i < wbCount; i++) {
                Shell s = map.get(key("W", wr, i));
                s.loserNextKey = key("L", lbRound, i);
                s.loserNextSlot = 2; // slot 1 is LB winner from previous
            }
        }

        // Grand final
        Shell gf1 = new Shell(key("GF", 1, 0), "grand_final", 1, 0, 0);
        Shell gf2 = new Shell(key("GF", 1, 1), "grand_final", 1, 1, 1);
        map.put(gf1.key, gf1);
        map.put(gf2.key, gf2);
        // GF1 winner path only used when reset needed — service wires players into GF2
        gf1.winnerNextKey = gf2.key;
        gf1.winnerNextSlot = 1; // placeholder; service handles both slots on reset
        // WB final winner → GF1 slot1; LB final winner → GF1 slot2
        Shell wbFinal = map.get(key("W", wbRounds, 0));
        wbFinal.winnerNextKey = gf1.key;
        wbFinal.winnerNextSlot = 1;
        // WB final loser already wired to LB last round slot2 above
        Shell lbFinal = map.get(key("L", lbRounds, 0));
        lbFinal.winnerNextKey = gf1.key;
        lbFinal.winnerNextSlot = 2;

        return new ArrayList<>(map.values());
    }

    /** LB match counts: for 8 → [2,2,1,1]; for 16 → [4,4,2,2,1,1] */
    static int[] lbMatchCounts(int n, int lbRounds) {
        int[] counts = new int[lbRounds];
        int cur = n / 4;
        counts[0] = cur;
        for (int r = 1; r < lbRounds; r++) {
            if (r % 2 == 1) {
                // major / drop round: same size as previous
                counts[r] = cur;
            } else {
                // minor / consolidate: half
                cur = cur / 2;
                counts[r] = cur;
            }
        }
        return counts;
    }

    private static String key(String side, int round, int index) {
        return side + ":" + round + ":" + index;
    }

    private static int log2(int n) {
        int r = 0;
        int v = n;
        while (v > 1) {
            v >>= 1;
            r++;
        }
        return r;
    }

    /** Sanity for tests / generate: expected total matches. */
    public static int expectedMatchCount(int bracketSize) {
        // WB: N-1, LB: N-2, GF: 2 → 2N - 1
        return 2 * bracketSize - 1;
    }

    public static Map<String, Shell> indexByKey(List<Shell> shells) {
        Map<String, Shell> m = new LinkedHashMap<>();
        for (Shell s : shells) {
            m.put(s.key, s);
        }
        return Collections.unmodifiableMap(m);
    }
}
