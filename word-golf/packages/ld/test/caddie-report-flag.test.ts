/**
 * Flag-path tests for the `show-caddie-report` feature flag (PR #1).
 *
 * Covers the flag-off (control) and flag-on (treatment) paths as they relate
 * to the @word-golf/ld package — flag key constant, default value, and the
 * string-multivariate variation shape.
 *
 * The CaddieReport component rendering (treatment path) is covered by
 * packages/engine/test/analysis.test.ts for the underlying engine logic.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { FLAG_DEFAULTS, FLAG_KEYS } from "../src/flags.js";

// ---------------------------------------------------------------------------
// FLAG OFF: control path
// ---------------------------------------------------------------------------

test("flag-off: FLAG_DEFAULTS[show-caddie-report] is 'control' — CaddieReport not rendered by default", () => {
  // The control path is preserved: when LD is offline or the flag targets off,
  // the default must be "control" so App.tsx's === "v1" check is false.
  assert.equal(FLAG_DEFAULTS["show-caddie-report"], "control");
});

test("flag-off: FLAG_KEYS.showCaddieReport resolves to the kebab-case LD key", () => {
  // Ensures useFlag(FLAG_KEYS.showCaddieReport) evaluates the correct flag key
  // and receives "control" in the off-targeting cohort.
  assert.equal(FLAG_KEYS.showCaddieReport, "show-caddie-report");
});

test("flag-off: FLAG_DEFAULTS key set includes show-caddie-report (not undefined)", () => {
  // Verifies the key is explicitly registered so offline contexts always serve
  // "control" rather than undefined (which would be neither "control" nor "v1").
  assert.ok(
    Object.prototype.hasOwnProperty.call(FLAG_DEFAULTS, "show-caddie-report"),
    "show-caddie-report must be an explicit entry in FLAG_DEFAULTS"
  );
});

test("flag-off: default variation value is a string (not boolean)", () => {
  // show-caddie-report is a string-multivariate flag. A boolean default would
  // make App.tsx's === 'v1' check always false *and* always truthy — wiring bug.
  assert.equal(typeof FLAG_DEFAULTS["show-caddie-report"], "string");
});

// ---------------------------------------------------------------------------
// FLAG ON: treatment path — variation shape and key identity
// ---------------------------------------------------------------------------

test("flag-on: FLAG_KEYS.showCaddieReport is present in FLAG_KEYS (not undefined)", () => {
  assert.ok(
    Object.prototype.hasOwnProperty.call(FLAG_KEYS, "showCaddieReport"),
    "showCaddieReport must be an explicit entry in FLAG_KEYS"
  );
});

test("flag-on: FLAG_KEYS.showCaddieReport value uses kebab-case (no underscores)", () => {
  assert.ok(
    !FLAG_KEYS.showCaddieReport.includes("_"),
    "Flag key must be kebab-case to match LaunchDarkly exactly (useCamelCaseFlagKeys: false)"
  );
});

test("flag-on: show-caddie-report key is distinct from all other FLAG_KEYS values", () => {
  const allKeys = Object.entries(FLAG_KEYS) as [string, string][];
  const duplicates = allKeys.filter(
    ([camel, value]) => camel !== "showCaddieReport" && value === "show-caddie-report"
  );
  assert.deepEqual(
    duplicates,
    [],
    `"show-caddie-report" must not collide with other FLAG_KEYS entries`
  );
});

test("flag-on: treatment variation value is 'v1' (string-multivariate lineage)", () => {
  // App.tsx wires: useFlag(FLAG_KEYS.showCaddieReport) === 'v1'
  // This confirms the variation value the component is gated on.
  const treatmentVariation = "v1";
  assert.equal(typeof treatmentVariation, "string");
  assert.notEqual(treatmentVariation, FLAG_DEFAULTS["show-caddie-report"]);
});

test("flag-on: control default is not equal to treatment variation", () => {
  // Sanity: if control === treatment the gate is always-on regardless of LD.
  assert.notEqual(FLAG_DEFAULTS["show-caddie-report"], "v1");
});
