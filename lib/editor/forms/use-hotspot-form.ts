"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  hotspotFormSchema,
  type HotspotFormValues,
} from "@/lib/editor/forms/schemas/hotspot-form.schema";
import { useEditorStore } from "@/lib/editor/state/editor-store";

export function useHotspotForm() {
  const selected = useEditorStore((s) =>
    s.hotspots.find((h) => h.id === s.selectedId),
  );
  const updateHotspot = useEditorStore((s) => s.updateHotspot);

  const form = useForm<HotspotFormValues>({
    resolver: zodResolver(hotspotFormSchema),
    defaultValues: {
      title: "",
      desc: "",
      image: "",
      link: "",
      type: "info",
      style: "dot",
      number: 1,
      icon: "ℹ",
      markerImage: "",
      color: "#e63946",
      pulse: false,
    },
  });

  const selectedId = selected?.id ?? null;

  useEffect(() => {
    if (!selected) return;
    form.reset({
      title: selected.title,
      desc: selected.desc,
      image: selected.image,
      link: selected.link,
      type: selected.type,
      style: selected.style,
      number: selected.number,
      icon: selected.icon,
      markerImage: selected.markerImage,
      color: selected.color,
      pulse: selected.pulse,
    });
    // Only re-seed the form when selection changes — not on every store patch
    // (e.g. drag position updates), otherwise typing fights with reset().
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, form]);

  useEffect(() => {
    if (selectedId == null) return;
    const subscription = form.watch((values) => {
      updateHotspot(selectedId, {
        title: values.title,
        desc: values.desc,
        image: values.image,
        link: values.link,
        type: values.type,
        style: values.style,
        number: values.number,
        icon: values.icon,
        markerImage: values.markerImage,
        color: values.color,
        pulse: values.pulse,
      });
    });
    return () => subscription.unsubscribe();
  }, [form, selectedId, updateHotspot]);

  return { form, selected };
}
