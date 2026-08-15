import { z } from "zod";

export const settingsFormSchema = z.object({
  hotspotSize: z.number().min(0.3).max(2.5),
  minDistance: z.number().min(0.2).max(20),
  maxDistance: z.number().min(5).max(120),
  minYaw: z.number().min(-180).max(180),
  maxYaw: z.number().min(-180).max(180),
  minPitch: z.number().min(0).max(180),
  maxPitch: z.number().min(0).max(180),
  minZoom: z.number().min(0).max(22),
  maxZoom: z.number().min(0).max(22),
  gridColor: z.string(),
  gridOpacity: z.number().min(0.05).max(1),
  gridSize: z.number().min(16).max(80),
  previewShowLabelOnSelect: z.boolean(),
  hotspotLabelColor: z.string(),
  hotspotLabelTextColor: z.string(),
  hotspotLabelBorderColor: z.string(),
  markerDialogPresentation: z.enum(["modal", "drawer", "infobox"]),
  markerDialogSize: z.enum(["medium", "large", "fullscreen"]),
  markerDialogBackdrop: z.boolean(),
  markerDialogBackdropBlur: z.boolean(),
  markerDialogResetCameraOnClose: z.boolean(),
  legendEnabled: z.boolean(),
  logoUrl: z.string(),
  logoScale: z.number().min(0.4).max(2.5),
});

export type SettingsFormValues = z.infer<typeof settingsFormSchema>;
