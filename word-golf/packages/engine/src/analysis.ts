import { WORD_LENGTH, type WordGraph } from "./types.js";

/**
 * Post-round move analysis ("caddie report").
 *
 * Classifies each move of a finished (or in-progress) round by whether it
 * moved the player closer to the target along an optimal line:
 *   - "fairway": the move reduced the shortest distance to the target
 *   - "rough":   the move kept the distance unchanged (a sideways step)
 *   - "hazard":  the move increased the distance, or left the reachable set
 *
 * One reverse breadth-first search from the target labels every reachable
 * word with its distance, so scoring a whole round costs a single BFS plus
 * O(path length) lookups.
 */

export type MoveQuality = "fairway" | "rough" | "hazard";

export interface MoveAnalysis {
  from: string;
  to: string;
  quality: MoveQuality;
  /** Optimal moves remaining after this move, or null when the target is unreachable from `to`. */
  remainingAfter: number | null;
}

export interface RoundAnalysis {
  moves: MoveAnalysis[];
  /** Count of "fairway" moves (steps that shortened the route). */
  onLine: number;
  /** Share of moves on an optimal line, 0..1; 1 when there are no moves. */
  accuracy: number;
}

/**
 * Distance from every reachable word to `target`, via BFS over the
 * wildcard-bucket index. The move relation is symmetric, so distances from
 * the target equal distances to it.
 */
export function distancesToTarget(
  target: string,
  graph: WordGraph
): Map<string, number> {
  const dist = new Map<string, number>();
  if (!graph.valid.has(target)) return dist;
  dist.set(target, 0);
  let frontier: string[] = [target];
  let distance = 0;
  while (frontier.length > 0) {
    distance++;
    const next: string[] = [];
    for (const word of frontier) {
      for (let i = 0; i < WORD_LENGTH; i++) {
        const pattern = word.slice(0, i) + "_" + word.slice(i + 1);
        const bucket = graph.buckets.get(pattern);
        if (!bucket) continue;
        for (const w of bucket) {
          if (!dist.has(w)) {
            dist.set(w, distance);
            next.push(w);
          }
        }
      }
    }
    frontier = next;
  }
  return dist;
}

/**
 * Analyze a played path (starting word first, as kept by the game UI) against
 * the target. Words outside the graph or cut off from the target are scored
 * as hazards with `remainingAfter: null`.
 */
export function analyzeRound(
  path: string[],
  target: string,
  graph: WordGraph
): RoundAnalysis {
  const dist = distancesToTarget(target, graph);
  const moves: MoveAnalysis[] = [];
  let onLine = 0;
  for (let i = 1; i < path.length; i++) {
    const from = path[i - 1];
    const to = path[i];
    const before = dist.get(from);
    const after = dist.get(to);
    let quality: MoveQuality;
    if (after === undefined) {
      quality = "hazard";
    } else if (before === undefined || after < before) {
      quality = "fairway";
    } else if (after === before) {
      quality = "rough";
    } else {
      quality = "hazard";
    }
    if (quality === "fairway") onLine++;
    moves.push({ from, to, quality, remainingAfter: after ?? null });
  }
  return {
    moves,
    onLine,
    accuracy: moves.length === 0 ? 1 : onLine / moves.length,
  };
}
