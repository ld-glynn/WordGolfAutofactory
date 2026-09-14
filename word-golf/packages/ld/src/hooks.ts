import { useContext } from "react";
import { useLDClient } from "@launchdarkly/react-sdk";
import { LDContext } from "./context.js";
import type { Flags } from "./flags.js";
import type { TrackFn } from "./events.js";

/** All current flag values (typed). */
export function useFlags(): Flags {
  return useContext(LDContext).flags;
}

/** A single flag value by key. */
export function useFlag<K extends keyof Flags>(key: K): Flags[K] {
  return useContext(LDContext).flags[key];
}

/** The typed metric tracker. No-ops when LD is not configured. */
export function useTrack(): TrackFn {
  return useContext(LDContext).track;
}

/** Whether a real LaunchDarkly client is connected. */
export function useLDLive(): boolean {
  return useContext(LDContext).live;
}

/**
 * The served variation INDEX for an experiment flag (via variationDetail).
 * Experiment payloads are opaque, so callers branch on this index. Falls back
 * to `fallback` (default 0 = control) when the LD client is not connected.
 */
export function useVariationIndex(key: string, fallback = 0): number {
  const client = useLDClient();
  if (!client) return fallback;
  const index = client.variationDetail(key, fallback).variationIndex;
  return typeof index === "number" ? index : fallback;
}
