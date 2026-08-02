"use client";

import { useSettingsStore } from "@/lib/editor/state/settings-store";

export function ViewportLogo() {
  const logoUrl = useSettingsStore((s) => s.logoUrl);
  const logoScale = useSettingsStore((s) => s.logoScale);

  if (!logoUrl.trim()) return null;

  return (
    <div
      className="editor-viewport-logo pointer-events-none absolute left-1/2 top-4 z-10"
      style={{ transform: `translateX(-50%) scale(${logoScale})` }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={logoUrl}
        alt="Project logo"
        className="editor-viewport-logo-img"
        draggable={false}
      />
    </div>
  );
}
