import { z } from "zod";

export const settingsFormSchema = z.object({
  hotspotSize: z.number().min(0.3).max(2.5),
  minDistance: z.number().min(0.2).max(20),
  maxDistance: z.number().min(5).max(120),
  minYaw: z.number().min(-180).max(180),
  maxYaw: z.number().min(-180).max(180),
  minPitch: z.number().min(0).max(180),
  maxPitch: z.number().min(0).max(180),
  gridColor: z.string(),
  gridOpacity: z.number().min(0.05).max(1),
  gridSize: z.number().min(16).max(80),
  previewShowLabelOnSelect: z.boolean(),
  hotspotLabelColor: z.string(),
  hotspotLabelTextColor: z.string(),
  hotspotLabelBorderColor: z.string(),
  markerDialogPresentation: z.enum(["modal", "drawer", "off"]),
  markerDialogBackdrop: z.boolean(),
  markerDialogBackdropBlur: z.boolean(),
  markerDialogResetCameraOnClose: z.boolean(),
});

export type SettingsFormValues = z.infer<typeof settingsFormSchema>;
