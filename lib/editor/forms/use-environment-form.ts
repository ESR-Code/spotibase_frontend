"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { DEFAULT_ENVIRONMENT_SETTINGS } from "@/lib/editor/constants/default-settings";
import {
  environmentFormSchema,
  type EnvironmentFormValues,
} from "@/lib/editor/forms/schemas/environment-form.schema";
import { useEnvironmentStore } from "@/lib/editor/state/environment-store";
import { useScenesStore } from "@/lib/editor/state/scenes-store";

function toFormValues(
  environment: EnvironmentFormValues | typeof DEFAULT_ENVIRONMENT_SETTINGS,
): EnvironmentFormValues {
  return {
    bgColor: environment.bgColor,
    show3dGrid: environment.show3dGrid,
    shadowIntensity: environment.shadowIntensity,
    shadowColor: environment.shadowColor,
    keyIntensity: environment.keyIntensity,
    keyColor: environment.keyColor,
    keyPitch: environment.keyPitch,
    keyYaw: environment.keyYaw,
    fillIntensity: environment.fillIntensity,
    fillColor: environment.fillColor,
    fillPitch: environment.fillPitch,
    fillYaw: environment.fillYaw,
  };
}

export function useEnvironmentForm() {
  const environment = useEnvironmentStore();
  const setEnvironment = useEnvironmentStore((s) => s.setEnvironment);
  const resetEnvironment = useEnvironmentStore((s) => s.resetEnvironment);
  const activeSceneId = useScenesStore((s) => s.activeSceneId);

  const form = useForm<EnvironmentFormValues>({
    resolver: zodResolver(environmentFormSchema),
    defaultValues: toFormValues(environment),
  });

  useEffect(() => {
    const subscription = form.watch((values) => {
      setEnvironment(values as Partial<EnvironmentFormValues>);
    });
    return () => subscription.unsubscribe();
  }, [form, setEnvironment]);

  // Keep the drawer form in sync when switching scenes.
  useEffect(() => {
    form.reset(toFormValues(useEnvironmentStore.getState()));
  }, [activeSceneId, form]);

  const reset = () => {
    resetEnvironment();
    form.reset({ ...DEFAULT_ENVIRONMENT_SETTINGS });
  };

  return { form, reset };
}
