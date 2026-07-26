"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  environmentFormSchema,
  type EnvironmentFormValues,
} from "@/lib/editor/forms/schemas/environment-form.schema";
import { useEnvironmentStore } from "@/lib/editor/state/environment-store";

export function useEnvironmentForm() {
  const environment = useEnvironmentStore();
  const setEnvironment = useEnvironmentStore((s) => s.setEnvironment);

  const form = useForm<EnvironmentFormValues>({
    resolver: zodResolver(environmentFormSchema),
    defaultValues: {
      bgMode: environment.bgMode,
      bgColor: environment.bgColor,
      show3dGrid: environment.show3dGrid,
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

  return { form };
}
