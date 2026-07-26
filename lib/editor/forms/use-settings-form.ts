"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
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
      hotspotSize: 1,
      minDistance: 1,
      maxDistance: 40,
      minYaw: -180,
      maxYaw: 180,
      minPitch: 0,
      maxPitch: 94,
      gridColor: "#3d5a80",
      gridOpacity: 0.7,
      gridSize: 42,
    });
  };

  return { form, reset };
}
