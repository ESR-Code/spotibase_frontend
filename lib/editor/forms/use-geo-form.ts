"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { DEFAULT_GEO_SETTINGS } from "@/lib/editor/constants/default-settings";
import {
  geoFormSchema,
  type GeoFormValues,
} from "@/lib/editor/forms/schemas/geo-form.schema";
import { useGeoStore } from "@/lib/editor/state/geo-store";
import { useScenesStore } from "@/lib/editor/state/scenes-store";
import type { GeoSettings } from "@/lib/editor/types/geo-settings";

function toFormValues(geo: GeoSettings): GeoFormValues {
  return {
    startLng: geo.start?.lng ?? null,
    startLat: geo.start?.lat ?? null,
    startZoom: geo.startZoom,
  };
}

function toGeoSettings(values: GeoFormValues): Partial<GeoSettings> {
  const hasStart = values.startLng != null && values.startLat != null;
  return {
    start: hasStart
      ? { lng: values.startLng as number, lat: values.startLat as number }
      : null,
    startZoom: values.startZoom,
  };
}

export function useGeoForm() {
  const geo = useGeoStore();
  const setGeo = useGeoStore((s) => s.setGeo);
  const resetGeo = useGeoStore((s) => s.resetGeo);
  const activeSceneId = useScenesStore((s) => s.activeSceneId);

  const form = useForm<GeoFormValues>({
    resolver: zodResolver(geoFormSchema),
    defaultValues: toFormValues(geo),
  });

  useEffect(() => {
    const subscription = form.watch((values) => {
      if (
        values.startZoom == null ||
        (values.startLng == null) !== (values.startLat == null)
      ) {
        return;
      }
      setGeo(toGeoSettings(values as GeoFormValues));
    });
    return () => subscription.unsubscribe();
  }, [form, setGeo]);

  useEffect(() => {
    form.reset(toFormValues(useGeoStore.getState()));
  }, [activeSceneId, form]);

  const reset = () => {
    resetGeo();
    form.reset(toFormValues(DEFAULT_GEO_SETTINGS));
  };

  return { form, reset };
}
