import { z } from "zod";

export const effectsFormSchema = z.object({
  aoEnabled: z.boolean(),
  aoIntensity: z.number().min(0).max(1),
  aoRadius: z.number().min(0).max(100),
  aoSamples: z.number().min(1).max(64),
  aoPower: z.number().min(0.1).max(10),
  aoBlurEnabled: z.boolean(),
});

export type EffectsFormValues = z.infer<typeof effectsFormSchema>;
