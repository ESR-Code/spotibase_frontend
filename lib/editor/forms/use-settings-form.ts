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

export function useSettingsForm() {
  const settings = useSettingsStore();
  const setSettings = useSettingsStore((s) => s.setSettings);
  const resetSettings = useSettingsStore((s) => s.resetSettings);

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
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
    },
  });

  useEffect(() => {
    const subscription = form.watch((values) => {
      setSettings(values as Partial<SettingsFormValues>);
    });
    return () => subscription.unsubscribe();
  }, [form, setSettings]);

  const reset = () => {
    resetSettings();
    form.reset({
      hotspotSize: DEFAULT_EDITOR_SETTINGS.hotspotSize,
      minDistance: DEFAULT_EDITOR_SETTINGS.minDistance,
      maxDistance: DEFAULT_EDITOR_SETTINGS.maxDistance,
      minYaw: DEFAULT_EDITOR_SETTINGS.minYaw,
      maxYaw: DEFAULT_EDITOR_SETTINGS.maxYaw,
      minPitch: DEFAULT_EDITOR_SETTINGS.minPitch,
      maxPitch: DEFAULT_EDITOR_SETTINGS.maxPitch,
      gridColor: DEFAULT_EDITOR_SETTINGS.gridColor,
      gridOpacity: DEFAULT_EDITOR_SETTINGS.gridOpacity,
      gridSize: DEFAULT_EDITOR_SETTINGS.gridSize,
    });
  };

  return { form, reset };
}
