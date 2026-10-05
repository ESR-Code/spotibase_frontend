"use client";

import { useRef } from "react";
import type { FieldValues, UseFormReturn } from "react-hook-form";

/**
 * Keep a scene-scoped form aligned with the live store after `switchScene`.
 *
 * Hydrate updates the store before React renders. `form.reset` notifies
 * `watch` in that same turn, so the reset has to happen during render and
 * the watch callback has to ignore it. An effect that resets later can
 * write the previous scene back over the incoming one.
 *
 * Callers must return early from `form.watch` while `skipStoreWriteRef`
 * is set. User edits still write the store. The explicit Reset action
 * writes the store itself, then resets the form outside this guard.
 */
export function useSceneFormReset<T extends FieldValues>(
  form: UseFormReturn<T>,
  activeSceneId: string,
  readValues: () => T,
) {
  const skipStoreWriteRef = useRef(false);
  const prevSceneIdRef = useRef(activeSceneId);

  if (prevSceneIdRef.current !== activeSceneId) {
    prevSceneIdRef.current = activeSceneId;
    skipStoreWriteRef.current = true;
    form.reset(readValues());
    skipStoreWriteRef.current = false;
  }

  return skipStoreWriteRef;
}
