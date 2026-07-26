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
  }, [selected, form]);

  useEffect(() => {
    if (!selected) return;
    const subscription = form.watch((values) => {
      updateHotspot(selected.id, {
        title: values.title ?? selected.title,
        desc: values.desc ?? selected.desc,
        image: values.image ?? selected.image,
        link: values.link ?? selected.link,
        type: values.type ?? selected.type,
        style: values.style ?? selected.style,
        number: values.number ?? selected.number,
        icon: values.icon ?? selected.icon,
        markerImage: values.markerImage ?? selected.markerImage,
        color: values.color ?? selected.color,
        pulse: values.pulse ?? selected.pulse,
      });
    });
    return () => subscription.unsubscribe();
  }, [form, selected, updateHotspot]);

  return { form, selected };
}
