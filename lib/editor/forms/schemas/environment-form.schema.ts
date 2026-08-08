import { z } from "zod";

export const environmentFormSchema = z.object({
  bgColor: z.string(),
  show3dGrid: z.boolean(),
  shadowIntensity: z.number().min(0).max(1),
  shadowColor: z.string(),
  keyIntensity: z.number().min(0).max(5),
  keyColor: z.string(),
  keyPitch: z.number().min(-90).max(90),
  keyYaw: z.number().min(-180).max(180),
  fillIntensity: z.number().min(0).max(5),
  fillColor: z.string(),
  fillPitch: z.number().min(-90).max(90),
  fillYaw: z.number().min(-180).max(180),
});

export type EnvironmentFormValues = z.infer<typeof environmentFormSchema>;
