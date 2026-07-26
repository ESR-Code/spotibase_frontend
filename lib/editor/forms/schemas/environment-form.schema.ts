import { z } from "zod";

export const environmentFormSchema = z.object({
  bgMode: z.enum(["grid", "color"]),
  bgColor: z.string(),
  show3dGrid: z.boolean(),
  keyIntensity: z.number().min(0).max(5),
  keyColor: z.string(),
  fillIntensity: z.number().min(0).max(5),
  fillColor: z.string(),
  fillPitch: z.number().min(-90).max(90),
  fillYaw: z.number().min(-180).max(180),
});

export type EnvironmentFormValues = z.infer<typeof environmentFormSchema>;
