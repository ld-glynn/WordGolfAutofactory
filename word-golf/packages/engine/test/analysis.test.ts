import { test } from "node:test";
import assert from "node:assert/strict";
import { buildWordGraph } from "../src/graph.js";
import { analyzeRound, distancesToTarget } from "../src/analysis.js";

test("distancesToTarget labels the reachable component", () => {
  // match -> march -> marsh chain; patch is one move from match.
  const g = buildWordGraph(["match", "march", "marsh", "patch"]);
  const dist = distancesToTarget("marsh", g);
  assert.equal(dist.get("marsh"), 0);
  assert.equal(dist.get("march"), 1);
  assert.equal(dist.get("match"), 2);
  assert.equal(dist.get("patch"), 3);
});

test("distancesToTarget is empty for a word outside the graph", () => {
  const g = buildWordGraph(["aaaaa"]);
  assert.equal(distancesToTarget("zzzzz", g).size, 0);
});

test("a straight optimal round is all fairway with perfect accuracy", () => {
  const g = buildWordGraph(["match", "march", "marsh"]);
  const round = analyzeRound(["match", "march", "marsh"], "marsh", g);
  assert.deepEqual(
    round.moves.map((m) => m.quality),
    ["fairway", "fairway"]
  );
  assert.equal(round.onLine, 2);
  assert.equal(round.accuracy, 1);
  assert.deepEqual(
    round.moves.map((m) => m.remainingAfter),
    [1, 0]
  );
});

test("a detour is scored rough or hazard", () => {
  // stare -> store is optimal (1 move); going via stark/stork detours.
  const g = buildWordGraph(["stare", "store", "stark", "stork", "scare"]);
  const round = analyzeRound(
    ["stare", "stark", "stork", "store"],
    "store",
    g
  );
  // stare(d=1) -> stark(d=2) hazard, stark -> stork(d=1) fairway, stork -> store fairway
  assert.deepEqual(
    round.moves.map((m) => m.quality),
    ["hazard", "fairway", "fairway"]
  );
  assert.equal(round.onLine, 2);
  assert.ok(Math.abs(round.accuracy - 2 / 3) < 1e-9);
});

test("a sideways move at constant distance is rough", () => {
  // Diamond: aaaaa and aaaac are both distance 2 from aaabb (via aaaab),
  // and adjacent to each other — stepping between them changes nothing.
  const g = buildWordGraph(["aaaaa", "aaaab", "aaabb", "aaaac"]);
  const dist = distancesToTarget("aaabb", g);
  assert.equal(dist.get("aaaaa"), 2);
  assert.equal(dist.get("aaaac"), 2);
  const round = analyzeRound(["aaaaa", "aaaac"], "aaabb", g);
  assert.deepEqual(
    round.moves.map((m) => m.quality),
    ["rough"]
  );
});

test("moves into words cut off from the target are hazards with null remaining", () => {
  const g = buildWordGraph(["aaaaa", "aaaab", "zzzzz"]);
  const round = analyzeRound(["aaaaa", "zzzzz"], "aaaab", g);
  assert.deepEqual(round.moves, [
    { from: "aaaaa", to: "zzzzz", quality: "hazard", remainingAfter: null },
  ]);
  assert.equal(round.accuracy, 0);
});

test("an empty round (no moves) has accuracy 1", () => {
  const g = buildWordGraph(["aaaaa"]);
  const round = analyzeRound(["aaaaa"], "aaaaa", g);
  assert.equal(round.moves.length, 0);
  assert.equal(round.accuracy, 1);
});
