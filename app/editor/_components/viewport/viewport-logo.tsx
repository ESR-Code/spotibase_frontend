"use client";

import type { CSSProperties } from "react";
import { useAssetSrc } from "@/lib/editor/assets";
import { useGeneralSettingsStore } from "@/lib/editor/state/general-settings-store";
import { useSettingsStore } from "@/lib/editor/state/settings-store";
import type { ViewportLogoPosition } from "@/lib/editor/types/editor-settings";
import { cn } from "@/lib/utils";

/**
 * Project logo at the top of the viewport. Rendered in each slot; only the
 * one matching `logoPosition` shows. `left` sits in the HUD stack and
 * `center` in the top-center stack (above a top menu bar), so neither overlaps.
 */
export function ViewportLogo({ slot }: { slot: ViewportLogoPosition }) {
  const logoUrl = useAssetSrc(useGeneralSettingsStore((s) => s.logoUrl));
  const logoScale = useGeneralSettingsStore((s) => s.logoScale);
  const position = useGeneralSettingsStore((s) => s.logoPosition);
  const hidden = useSettingsStore((s) => s.logoHidden);
  const shadow = useGeneralSettingsStore((s) => s.logoShadow);
  const invert = useGeneralSettingsStore((s) => s.logoInvert);

  if (hidden || !logoUrl.trim()) return null;
  if (position !== slot) return null;

  return (
    <div
      className={cn(
        "editor-viewport-logo pointer-events-none",
        position === "right" && "absolute right-4 top-4 z-10",
        position !== "right" && "flex-shrink-0",
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
