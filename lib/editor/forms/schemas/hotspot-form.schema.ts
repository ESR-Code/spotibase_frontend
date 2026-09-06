import { z } from "zod";

export const hotspotFormSchema = z.object({
  title: z.string().min(1),
  desc: z.string(),
  image: z.string(),
  link: z.string(),
  type: z.enum(["none", "info", "warning", "spec", "link"]),
  style: z.enum(["dot", "number", "icon", "image", "hidden"]),
  shape: z.enum(["circle", "square", "rounded", "diamond", "pin"]),
  number: z.union([z.string(), z.number()]),
  icon: z.string(),
  markerImage: z.string(),
  color: z.string(),
  pulse: z.boolean(),
  wick: z.boolean(),
  category: z.string(),
  legendName: z.string(),
});

export type HotspotFormValues = z.infer<typeof hotspotFormSchema>;
