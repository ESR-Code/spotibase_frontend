"use client";

import { HotspotImageField } from "@/app/editor/_components/drawers/hotspot-image-field";

type HotspotMarkerImageFieldProps = {
  value: string;
  onChange: (dataUrl: string) => void;
};

export function HotspotMarkerImageField({
  value,
  onChange,
}: HotspotMarkerImageFieldProps) {
  return (
    <HotspotImageField
      className="mt-2"
      value={value}
      onChange={onChange}
      uploadLabel="Upload icon"
      emptyLabel="No marker image"
      hint="PNG / SVG / WebP with transparency works best (pins, landmarks, custom icons)."
      clearTitle="Clear marker image"
      successMessage="Marker image applied"
      sizeErrorMessage="Marker image must be under 2.5 MB"
    />
  );
}
