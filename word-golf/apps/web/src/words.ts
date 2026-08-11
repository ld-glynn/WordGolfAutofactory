import {
  buildDailyPools,
  buildWordGraph,
  parseWordList,
  practicePoolsForDifficulty,
  type PracticeDifficulty,
  type PracticePoolOptions,
  type WordGraph,
} from "@word-golf/engine";

// The bundled lists are inlined at build time via Vite's `?raw` import.
import combinedRaw from "../../../data/combined_wordlist.txt?raw";
import answersRaw from "../../../data/shuffled_real_wordles.txt?raw";
import commonRaw from "../../../data/common_words.txt?raw";
import difficultRaw from "../../../data/difficult_words.txt?raw";

export const graph: WordGraph = buildWordGraph(parseWordList(combinedRaw));

const answers = parseWordList(answersRaw);
const common = parseWordList(commonRaw);
const difficult = parseWordList(difficultRaw);

const { startPool, targetPool } = buildDailyPools(answers, common);

export { startPool, targetPool };

/** Curated lists a player can switch between for practice puzzles. */
export type WordSet = "wordles" | "common" | "difficult";

export const WORD_SETS: readonly WordSet[] = [
  "wordles",
  "common",
  "difficult",
] as const;

export const WORD_SET_LABELS: Record<WordSet, string> = {
  wordles: "Wordles",
  common: "Common",
  difficult: "Difficult",
};

/** Practice-only pool presets; daily always uses `startPool` / `targetPool` above. */
export function practicePools(difficulty: PracticeDifficulty) {
  return practicePoolsForDifficulty(difficulty, answers, common, difficult);
}

/**
 * Practice pools for an explicit word-set choice.
 * Difficulty still controls minPar (and Hard forces the difficult-target path
 * when the Difficult set is selected).
 */
export function practicePoolsForWordSet(
  wordSet: WordSet,
  difficulty: PracticeDifficulty
): PracticePoolOptions & { difficulty: PracticeDifficulty } {
  const base = practicePools(difficulty);
  switch (wordSet) {
    case "wordles":
      return {
        ...base,
        startPool: answers,
        targetPool: answers,
        hardTargetPool: undefined,
        difficulty,
      };
    case "common":
      return {
        ...base,
        startPool: common,
        targetPool: common,
        hardTargetPool: undefined,
        difficulty: difficulty === "hard" ? "medium" : difficulty,
      };
    case "difficult":
      return {
        ...base,
        startPool: answers,
        targetPool: common,
        hardTargetPool: difficult,
        minPar: Math.max(base.minPar, 5),
        difficulty: "hard",
      };
  }
}
