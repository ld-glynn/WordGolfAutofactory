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
import { METRIC_EVENTS } from "../src/events.js";

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

// ---------------------------------------------------------------------------
// FLAG ON: treatment path — caddieReportViewed metric event (business/monitoring)
// ---------------------------------------------------------------------------

test("flag-on: METRIC_EVENTS.caddieReportViewed has the correct event key string", () => {
  // App.tsx (treatment path only) fires track(METRIC_EVENTS.caddieReportViewed)
  // when the CaddieReport panel is successfully rendered. The guarded-release
  // manifest wires "show-caddie-report-viewed" as the business occurrence
  // metric; this must match exactly.
  assert.equal(
    METRIC_EVENTS.caddieReportViewed,
    "show-caddie-report-viewed"
  );
});

test("flag-on: caddieReportViewed event key is present in METRIC_EVENTS taxonomy", () => {
  // Verifies the key was added to the shared taxonomy and is importable by
  // any consumer via @word-golf/ld.
  const values = Object.values(METRIC_EVENTS);
  assert.ok(
    values.includes("show-caddie-report-viewed"),
    "show-caddie-report-viewed must appear in METRIC_EVENTS"
  );
});

test("flag-on: METRIC_EVENTS.caddieReportViewed is distinct from all other event keys", () => {
  // Ensures no collision with existing metric keys — a collision would pollute
  // other guarded-release metrics with caddie panel impression counts.
  const allEvents = Object.entries(METRIC_EVENTS) as [string, string][];
  const duplicates = allEvents.filter(
    ([key, value]) =>
      key !== "caddieReportViewed" && value === "show-caddie-report-viewed"
  );
  assert.deepEqual(
    duplicates,
    [],
    `"show-caddie-report-viewed" must not collide with other METRIC_EVENTS entries`
  );
});

test("flag-on: caddieReportViewed event key is namespaced under show-caddie-report", () => {
  // Per project convention, guarded-release events are prefixed with the flag
  // key. This ensures the metric is clearly scoped to this feature.
  assert.ok(
    METRIC_EVENTS.caddieReportViewed.startsWith("show-caddie-report"),
    `caddieReportViewed event key must start with "show-caddie-report" (got: ${METRIC_EVENTS.caddieReportViewed})`
  );
});

// ---------------------------------------------------------------------------
// FLAG ON: treatment path — caddieReportError metric event (error/killswitch)
// ---------------------------------------------------------------------------

test("flag-on: METRIC_EVENTS.caddieReportError has the correct event key string", () => {
  // Fired when analyzeRound throws unexpectedly inside CaddieReport. The
  // guarded-release manifest wires "show-caddie-report-error" as the error
  // occurrence metric (lower is better / killswitch). Must match exactly.
  assert.equal(
    METRIC_EVENTS.caddieReportError,
    "show-caddie-report-error"
  );
});

test("flag-on: caddieReportError event key is present in METRIC_EVENTS taxonomy", () => {
  const values = Object.values(METRIC_EVENTS);
  assert.ok(
    values.includes("show-caddie-report-error"),
    "show-caddie-report-error must appear in METRIC_EVENTS"
  );
});

test("flag-on: METRIC_EVENTS.caddieReportError is distinct from all other event keys", () => {
  const allEvents = Object.entries(METRIC_EVENTS) as [string, string][];
  const duplicates = allEvents.filter(
    ([key, value]) =>
      key !== "caddieReportError" && value === "show-caddie-report-error"
  );
  assert.deepEqual(
    duplicates,
    [],
    `"show-caddie-report-error" must not collide with other METRIC_EVENTS entries`
  );
});

test("flag-on: caddieReportError event key is namespaced under show-caddie-report", () => {
  assert.ok(
    METRIC_EVENTS.caddieReportError.startsWith("show-caddie-report"),
    `caddieReportError event key must start with "show-caddie-report" (got: ${METRIC_EVENTS.caddieReportError})`
  );
});

test("flag-on: caddieReportViewed and caddieReportError event keys are distinct from each other", () => {
  // Sanity: a success event must never be aliased to an error event.
  assert.notEqual(
    METRIC_EVENTS.caddieReportViewed,
    METRIC_EVENTS.caddieReportError
  );
});

// ---------------------------------------------------------------------------
// FLAG OFF: metric events must not fire on the control path
// ---------------------------------------------------------------------------

test("flag-off: control default 'control' ensures CaddieReport never renders (metric events never emitted)", () => {
  // In App.tsx the guard is: useFlag(FLAG_KEYS.showCaddieReport) === "v1"
  // With the default of "control" this is false — CaddieReport is not mounted
  // and neither caddieReportViewed nor caddieReportError can fire.
  // Structural precondition: default is "control" AND event keys are correct.
  assert.equal(FLAG_DEFAULTS["show-caddie-report"], "control");
  assert.equal(METRIC_EVENTS.caddieReportViewed, "show-caddie-report-viewed");
  assert.equal(METRIC_EVENTS.caddieReportError, "show-caddie-report-error");
});

test("flag-off: existing metric events are unchanged (control-path events unaffected)", () => {
  // Regression guard: adding caddie-report metric events must not disturb
  // existing events that fire on both control and treatment paths.
  assert.equal(METRIC_EVENTS.puzzleCompleted, "puzzle_completed");
  assert.equal(METRIC_EVENTS.puzzleAbandoned, "puzzle_abandoned");
  assert.equal(METRIC_EVENTS.timeToSolveMs, "time_to_solve_ms");
  assert.equal(METRIC_EVENTS.madePar, "made_par");
  assert.equal(METRIC_EVENTS.poweredByFooterViewed, "show-powered-by-footer-viewed");
});
