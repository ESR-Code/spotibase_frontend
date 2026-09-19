"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { DEFAULT_EDITOR_SETTINGS } from "@/lib/editor/constants/default-settings";
import {
  settingsFormSchema,
  type SettingsFormValues,
} from "@/lib/editor/forms/schemas/settings-form.schema";
import { useScenesStore } from "@/lib/editor/state/scenes-store";
import { useSettingsStore } from "@/lib/editor/state/settings-store";

function toFormValues(
  settings: SettingsFormValues | typeof DEFAULT_EDITOR_SETTINGS,
): SettingsFormValues {
  return {
    hotspotSize: settings.hotspotSize,
    minDistance: settings.minDistance,
    maxDistance: settings.maxDistance,
    minYaw: settings.minYaw,
    maxYaw: settings.maxYaw,
    minPitch: settings.minPitch,
    maxPitch: settings.maxPitch,
    minZoom: settings.minZoom,
    maxZoom: settings.maxZoom,
    gridColor: settings.gridColor,
    gridOpacity: settings.gridOpacity,
    gridSize: settings.gridSize,
    previewShowLabelOnSelect: settings.previewShowLabelOnSelect,
    hotspotLabelColor: settings.hotspotLabelColor,
    hotspotLabelTextColor: settings.hotspotLabelTextColor,
    hotspotLabelBorderColor: settings.hotspotLabelBorderColor,
    markerDialogPresentation: settings.markerDialogPresentation,
    markerDialogSize: settings.markerDialogSize,
    markerDialogDrawerInset: settings.markerDialogDrawerInset ?? false,
    markerDialogBackdrop: settings.markerDialogBackdrop,
    markerDialogBackdropBlur: settings.markerDialogBackdropBlur,
    markerDialogResetCameraOnClose: settings.markerDialogResetCameraOnClose,
    legendEnabled: settings.legendEnabled,
    logoUrl: settings.logoUrl,
    logoScale: settings.logoScale,
  };
}

function definedPatch(
  values: Partial<SettingsFormValues>,
): Partial<SettingsFormValues> {
  const patch: Partial<SettingsFormValues> = {};
  for (const key of Object.keys(values) as (keyof SettingsFormValues)[]) {
    const value = values[key];
    if (value !== undefined) {
      (patch as Record<string, unknown>)[key] = value;
    }
  }
  return patch;
}

export function useSettingsForm() {
  const setSettings = useSettingsStore((s) => s.setSettings);
  const resetSettings = useSettingsStore((s) => s.resetSettings);
  const activeSceneId = useScenesStore((s) => s.activeSceneId);
  const skipStoreWriteRef = useRef(false);
  const prevSceneIdRef = useRef(activeSceneId);

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: toFormValues(useSettingsStore.getState()),
  });

  useEffect(() => {
    const subscription = form.watch((values) => {
      if (skipStoreWriteRef.current) return;
      setSettings(definedPatch(values as Partial<SettingsFormValues>));
    });
    return () => subscription.unsubscribe();
  }, [form, setSettings]);

  // Reset during render (same tick as hydrate) so a stale watch cannot
  // overwrite per-scene fields like legendEnabled after switchScene.
  if (prevSceneIdRef.current !== activeSceneId) {
    prevSceneIdRef.current = activeSceneId;
    skipStoreWriteRef.current = true;
    form.reset(toFormValues(useSettingsStore.getState()));
    skipStoreWriteRef.current = false;
  }

  const reset = () => {
    resetSettings();
    form.reset(toFormValues(DEFAULT_EDITOR_SETTINGS));
  };

  return { form, reset };
}
