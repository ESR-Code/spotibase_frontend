"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { DEFAULT_EFFECTS_SETTINGS } from "@/lib/editor/constants/default-settings";
import { useSceneFormReset } from "@/lib/editor/forms/use-scene-form-reset";
import {
  effectsFormSchema,
  type EffectsFormValues,
} from "@/lib/editor/forms/schemas/effects-form.schema";
import { useEffectsStore } from "@/lib/editor/state/effects-store";
import { useScenesStore } from "@/lib/editor/state/scenes-store";

function toFormValues(
  effects: EffectsFormValues | typeof DEFAULT_EFFECTS_SETTINGS,
): EffectsFormValues {
  return {
    aoEnabled: effects.aoEnabled,
    aoIntensity: effects.aoIntensity,
    aoRadius: effects.aoRadius,
    aoSamples: effects.aoSamples,
    aoPower: effects.aoPower,
    aoBlurEnabled: effects.aoBlurEnabled,
  };
}

export function useEffectsForm() {
  const effects = useEffectsStore();
  const setEffects = useEffectsStore((s) => s.setEffects);
  const resetEffects = useEffectsStore((s) => s.resetEffects);
  const activeSceneId = useScenesStore((s) => s.activeSceneId);

  const form = useForm<EffectsFormValues>({
    resolver: zodResolver(effectsFormSchema),
    defaultValues: toFormValues(effects),
  });
  const skipStoreWriteRef = useSceneFormReset(form, activeSceneId, () =>
    toFormValues(useEffectsStore.getState()),
  );

  useEffect(() => {
    const subscription = form.watch((values) => {
      if (skipStoreWriteRef.current) return;
      setEffects(values as Partial<EffectsFormValues>);
    });
    return () => subscription.unsubscribe();
  }, [form, setEffects, skipStoreWriteRef]);

  const reset = () => {
    resetEffects();
    form.reset({ ...DEFAULT_EFFECTS_SETTINGS });
  };

  return { form, reset };
}