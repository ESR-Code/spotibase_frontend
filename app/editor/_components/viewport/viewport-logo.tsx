"use client";

import type { CSSProperties } from "react";
import { useAssetSrc } from "@/lib/editor/assets";
import { useGeneralSettingsStore } from "@/lib/editor/state/general-settings-store";
import { useSettingsStore } from "@/lib/editor/state/settings-store";
import { cn } from "@/lib/utils";

/**
 * Project logo at the top of the viewport. `slot="hud"` renders the left
 * placement inside the HUD stack (so it never overlaps the HUD panel);
 * `slot="overlay"` renders center / right as an absolute overlay.
 */
export function ViewportLogo({ slot }: { slot: "hud" | "overlay" }) {
  const logoUrl = useAssetSrc(useGeneralSettingsStore((s) => s.logoUrl));
  const logoScale = useGeneralSettingsStore((s) => s.logoScale);
  const position = useGeneralSettingsStore((s) => s.logoPosition);
  const hidden = useSettingsStore((s) => s.logoHidden);
  const shadow = useGeneralSettingsStore((s) => s.logoShadow);
  const invert = useGeneralSettingsStore((s) => s.logoInvert);

  if (hidden || !logoUrl.trim()) return null;
  if ((position === "left") !== (slot === "hud")) return null;

  return (
    <div
      className={cn(
        "editor-viewport-logo pointer-events-none",
        position === "center" && "absolute left-1/2 top-4 z-10 -translate-x-1/2",
        position === "right" && "absolute right-4 top-4 z-10",
        position === "left" && "flex-shrink-0",
      )}
      // Scale through size (not transform) so the HUD stack reflows below a left logo.
      style={{ "--editor-logo-scale": logoScale } as CSSProperties}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={logoUrl}
        alt="Project logo"
        className={cn(
          "editor-viewport-logo-img",
          shadow && "editor-viewport-logo-shadow",
          invert && "editor-viewport-logo-invert",
        )}
        draggable={false}
      />
    </div>
  );
}
