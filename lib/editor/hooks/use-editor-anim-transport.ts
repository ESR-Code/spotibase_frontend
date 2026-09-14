"use client";

import { useEffect, useLayoutEffect } from "react";
import {
  pauseEditorAnimation,
  playEditorAnimation,
  readEditorAnimationTime,
  resetModelAnimation,
  seekEditorAnimation,
} from "@/lib/editor/engine/model-animation";
import { useEditorAnimPreviewStore } from "@/lib/editor/state/editor-anim-preview-store";
import { useEditorStore } from "@/lib/editor/state/editor-store";
import { useModelStore } from "@/lib/editor/state/model-store";
import { useActiveScene } from "@/lib/editor/state/scenes-store";

const END_EPSILON = 0.001;

export function useEditorAnimTransport() {
  const sceneType = useActiveScene().type;
  const isPreview = useEditorStore((s) => s.isPreview);
  const animations = useModelStore((s) => s.animations);
  const clipId = useEditorAnimPreviewStore((s) => s.clipId);
  const playing = useEditorAnimPreviewStore((s) => s.playing);
  const currentTime = useEditorAnimPreviewStore((s) => s.currentTime);

  useLayoutEffect(() => {
    const store = useEditorAnimPreviewStore.getState();
    if (animations.length === 0) {
      if (store.clipId !== null || store.playing || store.currentTime !== 0) {
        store.reset(null);
      }
      return;
    }
    const exists = animations.some((clip) => clip.id === store.clipId);
    if (exists) return;
    const previous = store.clipId;
    const next = animations[0].id;
    store.reset(next);
    if (previous) {
      seekEditorAnimation(next, 0);
    }
  }, [animations]);

  const clip =
    animations.find((item) => item.id === clipId) ?? animations[0] ?? null;
  const activeClipId = clip?.id ?? null;
  const duration = clip?.duration ?? 0;
  const visible =
    !isPreview && sceneType === "model" && animations.length > 0;

  useEffect(() => {
    if (
      isPreview ||
      sceneType !== "model" ||
      !playing ||
      !activeClipId ||
      duration <= 0
    ) {
      return;
    }
    let cancelled = false;
    let raf = 0;
    const tick = () => {
      if (cancelled) return;
      const time = readEditorAnimationTime();
      if (time >= duration - END_EPSILON) {
        pauseEditorAnimation();
        const store = useEditorAnimPreviewStore.getState();
        store.setCurrentTime(duration);
        store.setPlaying(false);
        return;
      }
      useEditorAnimPreviewStore.getState().setCurrentTime(time);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [playing, activeClipId, duration, isPreview, sceneType]);

  const selectClip = (nextId: string) => {
    if (!nextId || nextId === activeClipId) return;
    useEditorAnimPreviewStore.getState().reset(nextId);
    seekEditorAnimation(nextId, 0);
  };

  const togglePlay = () => {
    if (!activeClipId || duration <= 0) return;
    const store = useEditorAnimPreviewStore.getState();
    if (store.playing) {
      pauseEditorAnimation();
      store.setCurrentTime(readEditorAnimationTime());
      store.setPlaying(false);
      return;
    }
    const start =
      store.currentTime >= duration - END_EPSILON ? 0 : store.currentTime;
    store.setCurrentTime(start);
    store.setPlaying(true);
    playEditorAnimation(activeClipId, start);
  };

  const seek = (time: number) => {
    if (!activeClipId) return;
    const clamped =
      duration > 0 ? Math.min(Math.max(0, time), duration) : 0;
    const store = useEditorAnimPreviewStore.getState();
    if (store.playing) {
      pauseEditorAnimation();
      store.setPlaying(false);
    }
    seekEditorAnimation(activeClipId, clamped);
    store.setCurrentTime(clamped);
  };

  const reset = () => {
    resetModelAnimation();
    useEditorAnimPreviewStore.getState().reset();
  };

  return {
    visible,
    animations,
    clipId: activeClipId,
    playing,
    currentTime,
    duration,
    selectClip,
    togglePlay,
    seek,
    reset,
  };
}
