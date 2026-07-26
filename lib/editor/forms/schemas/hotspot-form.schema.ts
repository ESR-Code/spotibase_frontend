import { z } from "zod";

export const hotspotFormSchema = z.object({
  title: z.string().min(1),
  desc: z.string(),
  image: z.string(),
  link: z.string(),
  type: z.enum(["info", "warning", "spec", "link"]),
  style: z.enum(["dot", "number", "icon", "image"]),
  number: z.union([z.string(), z.number()]),
  icon: z.string(),
  markerImage: z.string(),
  color: z.string(),
  pulse: z.boolean(),
});

export type HotspotFormValues = z.infer<typeof hotspotFormSchema>;
