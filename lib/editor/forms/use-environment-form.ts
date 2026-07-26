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

export function useEnvironmentForm() {
  const environment = useEnvironmentStore();
  const setEnvironment = useEnvironmentStore((s) => s.setEnvironment);
  const resetEnvironment = useEnvironmentStore((s) => s.resetEnvironment);

  const form = useForm<EnvironmentFormValues>({
    resolver: zodResolver(environmentFormSchema),
    defaultValues: {
      bgColor: environment.bgColor,
      show3dGrid: environment.show3dGrid,
      shadowIntensity: environment.shadowIntensity,
      shadowColor: environment.shadowColor,
      keyIntensity: environment.keyIntensity,
      keyColor: environment.keyColor,
      fillIntensity: environment.fillIntensity,
      fillColor: environment.fillColor,
      fillPitch: environment.fillPitch,
      fillYaw: environment.fillYaw,
    },
  });

  useEffect(() => {
    const subscription = form.watch((values) => {
      setEnvironment(values as Partial<EnvironmentFormValues>);
    });
    return () => subscription.unsubscribe();
  }, [form, setEnvironment]);

  const reset = () => {
    resetEnvironment();
    form.reset({ ...DEFAULT_ENVIRONMENT_SETTINGS });
  };

  return { form, reset };
}
