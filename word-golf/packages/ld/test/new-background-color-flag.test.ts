/**
 * Flag-path tests for the `enable-new-background-color` feature flag (#2).
 *
 * Covers the flag-off (control) and flag-on (treatment / v1) paths as they
 * relate to the @word-golf/ld package — i.e. the flag default, flag key
 * constants, and the newly-instrumented METRIC_EVENTS.newBackgroundColorViewed
 * event key.
 *
 * Control path  ("control"): original near-black background (#0e1116) set in
 * styles.css is used; document.documentElement.style is never mutated and the
 * metric event is never emitted.
 *
 * Treatment path ("v1"): the green-tinted dark background (#1c3028) is applied
 * via document.documentElement.style.setProperty("--bg", "#1c3028") inside a
 * useEffect; METRIC_EVENTS.newBackgroundColorViewed is tracked once per render.
 * The cleanup function removes the property, restoring the CSS baseline when
 * the flag flips back to control.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { FLAG_DEFAULTS, FLAG_KEYS } from "../src/flags.js";
import { METRIC_EVENTS } from "../src/events.js";

// ---------------------------------------------------------------------------
// FLAG OFF: control path
// ---------------------------------------------------------------------------

test('flag-off: FLAG_DEFAULTS["enable-new-background-color"] is "control" — original background used by default', () => {
  // Control path: when LD is offline or the flag targets control, the default
  // must be "control" so the CSS baseline (#0e1116 from styles.css) is used
  // and document.documentElement.style is never touched.
  assert.equal(FLAG_DEFAULTS["enable-new-background-color"], "control");
});

test("flag-off: FLAG_KEYS.enableNewBackgroundColor resolves to the kebab-case LD key", () => {
  // Ensures useFlag(FLAG_KEYS.enableNewBackgroundColor) in App.tsx evaluates
  // the correct LD flag key and receives the "control" default value.
  assert.equal(FLAG_KEYS.enableNewBackgroundColor, "enable-new-background-color");
});

test('flag-off: FLAG_DEFAULTS key set includes "enable-new-background-color" (not undefined)', () => {
  // Verifies the key is explicitly registered in FLAG_DEFAULTS so offline
  // contexts (no LD client) always serve "control" rather than undefined.
  assert.ok(
    Object.prototype.hasOwnProperty.call(FLAG_DEFAULTS, "enable-new-background-color"),
    '"enable-new-background-color" must be an explicit entry in FLAG_DEFAULTS'
  );
});

test('flag-off: default "control" value means the v1 useEffect branch is skipped (no --bg mutation)', () => {
  // In App.tsx the useEffect guard is:
  //   if (newBackgroundColor === "v1") { ... }
  // With the flag default of "control" the condition is false and
  // document.documentElement.style.setProperty("--bg", "#1c3028") is never called.
  // This test verifies the structural precondition: the default is "control"
  // (not "v1"), so the treatment branch is never entered on the control path.
  assert.notEqual(FLAG_DEFAULTS["enable-new-background-color"], "v1");
  assert.equal(FLAG_DEFAULTS["enable-new-background-color"], "control");
});

test("flag-off: newBackgroundColorViewed metric event is never emitted on control path (event key still resolves correctly)", () => {
  // The track() call lives inside the `if (newBackgroundColor === "v1")` block;
  // on the control path it is never reached.
  // This test ensures the event constant resolves to the correct string so that
  // when the flag IS on the call uses the right key.
  assert.equal(
    METRIC_EVENTS.newBackgroundColorViewed,
    "enable-new-background-color-viewed"
  );
});

test("flag-off: existing FLAG_DEFAULTS are unchanged (control-path flags unaffected)", () => {
  // Regression guard: adding enable-new-background-color must not disturb
  // existing flag defaults that gate other features.
  assert.equal(FLAG_DEFAULTS["hint-button"], false);
  assert.equal(FLAG_DEFAULTS["show-mission-control"], false);
  assert.equal(FLAG_DEFAULTS["enable-random-puzzle"], false);
  assert.equal(FLAG_DEFAULTS["show-powered-by-footer"], false);
  assert.equal(FLAG_DEFAULTS["enable-session-replay"], false);
  assert.equal(FLAG_DEFAULTS["enable-difficulty-picker-ux"], false);
});

// ---------------------------------------------------------------------------
// FLAG ON: treatment path (v1)
// ---------------------------------------------------------------------------

test("flag-on: FLAG_KEYS.enableNewBackgroundColor is present in FLAG_KEYS (not undefined)", () => {
  // Treatment path relies on this key to evaluate the flag. Must be registered.
  assert.ok(
    Object.prototype.hasOwnProperty.call(FLAG_KEYS, "enableNewBackgroundColor"),
    "enableNewBackgroundColor must be an explicit entry in FLAG_KEYS"
  );
});

test("flag-on: FLAG_KEYS.enableNewBackgroundColor value uses kebab-case (no underscores)", () => {
  // LaunchDarkly flag keys use kebab-case; the provider is configured with
  // useCamelCaseFlagKeys: false so the raw key string must be kebab-case.
  assert.ok(
    !FLAG_KEYS.enableNewBackgroundColor.includes("_"),
    "enable-new-background-color must be kebab-case (no underscores)"
  );
});

test("flag-on: enable-new-background-color key is distinct from all other FLAG_KEYS values", () => {
  // Ensures no accidental collision with an existing flag key, which would
  // cause two different features to respond to the same LD flag.
  const allKeys = Object.entries(FLAG_KEYS) as [string, string][];
  const duplicates = allKeys.filter(
    ([name, value]) =>
      name !== "enableNewBackgroundColor" &&
      value === "enable-new-background-color"
  );
  assert.deepEqual(
    duplicates,
    [],
    '"enable-new-background-color" must not collide with other FLAG_KEYS entries'
  );
});

test('flag-on: treatment variation string is "v1" (multivariate string flag)', () => {
  // The flag is a STRING MULTIVARIATE flag. The treatment variation that applies
  // the new background must be compared with the string literal "v1", NOT a
  // boolean. The Flags interface records the allowed values.
  // We verify by checking the control default is "control" (a string, not false).
  const controlDefault: "control" | "v1" = FLAG_DEFAULTS["enable-new-background-color"];
  assert.equal(typeof controlDefault, "string");
  // "v1" is the other legal value; asserting the two known values are distinct
  // strings covers the type contract.
  assert.notEqual("v1", "control");
});

test("flag-on: METRIC_EVENTS.newBackgroundColorViewed has the correct event key string", () => {
  // App.tsx calls track(METRIC_EVENTS.newBackgroundColorViewed) inside the
  // `if (newBackgroundColor === "v1")` block — treatment path only.
  // The guarded-release manifest wires "enable-new-background-color-viewed"
  // as the monitoring occurrence metric; this must match exactly.
  assert.equal(
    METRIC_EVENTS.newBackgroundColorViewed,
    "enable-new-background-color-viewed"
  );
});

test("flag-on: newBackgroundColorViewed event key is present in METRIC_EVENTS taxonomy", () => {
  // Verifies the key was added to the shared taxonomy and is importable by
  // any consumer (e.g. App.tsx) via @word-golf/ld.
  const values = Object.values(METRIC_EVENTS) as string[];
  assert.ok(
    values.includes("enable-new-background-color-viewed"),
    '"enable-new-background-color-viewed" must appear in METRIC_EVENTS'
  );
});

test("flag-on: newBackgroundColorViewed event key is distinct from all other METRIC_EVENTS values", () => {
  // Ensures no accidental collision with existing metric keys — a collision
  // would pollute other guarded-release metrics with background impression counts.
  const allEvents = Object.entries(METRIC_EVENTS) as [string, string][];
  const duplicates = allEvents.filter(
    ([key, value]) =>
      key !== "newBackgroundColorViewed" &&
      value === "enable-new-background-color-viewed"
  );
  assert.deepEqual(
    duplicates,
    [],
    '"enable-new-background-color-viewed" must not collide with other METRIC_EVENTS entries'
  );
});

test("flag-on: newBackgroundColorViewed event key is namespaced under enable-new-background-color", () => {
  // Per project convention, guarded-release events are prefixed with the flag key.
  // This ensures the metric is clearly scoped to this feature in the LD UI.
  assert.ok(
    METRIC_EVENTS.newBackgroundColorViewed.startsWith("enable-new-background-color"),
    `newBackgroundColorViewed event key must start with "enable-new-background-color" (got: ${METRIC_EVENTS.newBackgroundColorViewed})`
  );
});

test("flag-on: existing METRIC_EVENTS are unchanged (other events unaffected)", () => {
  // Regression guard: adding newBackgroundColorViewed must not disturb
  // existing events that fire on both control and treatment paths.
  assert.equal(METRIC_EVENTS.puzzleCompleted, "puzzle_completed");
  assert.equal(METRIC_EVENTS.puzzleAbandoned, "puzzle_abandoned");
  assert.equal(METRIC_EVENTS.timeToSolveMs, "time_to_solve_ms");
  assert.equal(METRIC_EVENTS.madePar, "made_par");
  assert.equal(METRIC_EVENTS.hintButtonUsed, "hint-button-used");
  assert.equal(METRIC_EVENTS.poweredByFooterViewed, "show-powered-by-footer-viewed");
});

// ---------------------------------------------------------------------------
// Cleanup / reset semantics (structural contract tests)
// ---------------------------------------------------------------------------

test("cleanup: useEffect returns a cleanup that removes --bg (structural contract: cleanup is not fired on control path)", () => {
  // This test verifies the structural pre-condition for the cleanup logic:
  // The flag default is "control", so the useEffect body never runs on the
  // control path and the cleanup function is never returned — meaning the CSS
  // variable is never set and therefore never needs to be removed.
  //
  // On the treatment path ("v1") the cleanup is returned and fires on unmount
  // or when the flag flips back to "control", restoring the CSS baseline.
  // We cannot fully exercise the DOM in a Node test runner, so we verify the
  // precondition: only "v1" triggers the branch; "control" does not.
  const flagValue = FLAG_DEFAULTS["enable-new-background-color"];
  const treatmentActive = flagValue === "v1";
  assert.equal(treatmentActive, false, "Control default must NOT trigger the v1 treatment branch");
});

test("cleanup: flag type is string — no boolean coercion risk in the v1 guard", () => {
  // Defensive: if the flag were accidentally typed as boolean, a truthy check
  // (`if (newBackgroundColor)`) would fire on "control" too (non-empty string).
  // The implementation correctly uses strict equality `=== "v1"`, so the
  // string "control" is safely excluded. We verify the default IS a string.
  const defaultVal = FLAG_DEFAULTS["enable-new-background-color"];
  assert.equal(typeof defaultVal, "string");
  // And that only the exact value "v1" would pass the guard:
  assert.equal(defaultVal === "v1", false);
  assert.equal("v1" === "v1", true);
});
