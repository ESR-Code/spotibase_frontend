import { z } from "zod";

export const geoFormSchema = z.object({
  startLng: z.number().min(-180).max(180).nullable(),
  startLat: z.number().min(-90).max(90).nullable(),
  startZoom: z.number().min(0).max(22),
});

export type GeoFormValues = z.infer<typeof geoFormSchema>;
