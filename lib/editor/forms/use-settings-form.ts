"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { DEFAULT_EDITOR_SETTINGS } from "@/lib/editor/constants/default-settings";
import {
  settingsFormSchema,
  type SettingsFormValues,
} from "@/lib/editor/forms/schemas/settings-form.schema";
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
    gridColor: settings.gridColor,
    gridOpacity: settings.gridOpacity,
    gridSize: settings.gridSize,
    markerDialogPresentation: settings.markerDialogPresentation,
    markerDialogBackdrop: settings.markerDialogBackdrop,
    markerDialogBackdropBlur: settings.markerDialogBackdropBlur,
  };
}

export function useSettingsForm() {
  const settings = useSettingsStore();
  const setSettings = useSettingsStore((s) => s.setSettings);
  const resetSettings = useSettingsStore((s) => s.resetSettings);

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: toFormValues(settings),
  });

  useEffect(() => {
    const subscription = form.watch((values) => {
      setSettings(values as Partial<SettingsFormValues>);
    });
    return () => subscription.unsubscribe();
  }, [form, setSettings]);

  const reset = () => {
    resetSettings();
    form.reset(toFormValues(DEFAULT_EDITOR_SETTINGS));
  };

  return { form, reset };
}
