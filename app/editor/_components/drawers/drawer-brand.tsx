"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";
import { IconButton } from "@/app/editor/_components/ui/icon-button";
import { useAssetSrc } from "@/lib/editor/assets/resolve";
import { useGeneralSettingsStore } from "@/lib/editor/state/general-settings-store";
import type { DrawerLogoSize } from "@/lib/editor/types/editor-settings";
import { cn } from "@/lib/utils";

const INLINE_LOGO_CLASS: Record<Exclude<DrawerLogoSize, "full">, string> = {
  small: "h-8 max-w-[96px]",
  medium: "h-12 max-w-[160px]",
  large: "h-16 max-w-[220px]",
};

type DrawerHeaderProps = {
  title: string;
  /** Drawer logo override (`asset:<id>` / URL); empty falls back to the project logo. */
  logoUrl: string;
  logoSize: DrawerLogoSize;
  /** Logo only: hides the title and subtitle (ignored when there is no logo). */
  hideTitle: boolean;
  /** Line under the title (counts etc.). */
  subtitle?: ReactNode;
  closeTitle: string;
  onClose: () => void;
};

/** Preview drawer header (Legend, Scene Explorer): logo, title and close button. */
export function DrawerHeader({
  title,
  logoUrl,
  logoSize,
  hideTitle,
  subtitle,
  closeTitle,
  onClose,
}: DrawerHeaderProps) {
  const projectLogo = useGeneralSettingsStore((s) => s.logoUrl);
  const logo = useAssetSrc(logoUrl.trim() || projectLogo).trim();
  const showTitle = !hideTitle || !logo;
  const banner = Boolean(logo) && logoSize === "full";

  const closeButton = (
    <IconButton
      title={closeTitle}
      className={banner ? "editor-drawer-banner-close" : undefined}
      onClick={onClose}
    >
      <X />
    </IconButton>
  );

  const titleBlock = showTitle ? (
    <div className="min-w-0">
      <div className="truncate font-display text-[14px] font-bold" title={title}>
        {title}
      </div>
      {subtitle ? (
        <div className="text-[11px]" style={{ color: "var(--editor-muted)" }}>
          {subtitle}
        </div>
      ) : null}
    </div>
  ) : null;

  if (banner) {
    return (
      <div className="editor-preview-divider flex-shrink-0">
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logo}
            alt={showTitle ? "" : title}
            className="block max-h-[240px] w-full object-cover"
            draggable={false}
          />
          <div className="absolute right-3 top-3 z-10">{closeButton}</div>
        </div>
        {titleBlock ? <div className="px-4 py-3">{titleBlock}</div> : null}
      </div>
    );
  }

  return (
    <div className="editor-preview-divider flex flex-shrink-0 items-center justify-between gap-3 px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logo}
            alt={showTitle ? "" : title}
            className={cn(
              "flex-shrink-0 object-contain",
              INLINE_LOGO_CLASS[logoSize === "full" ? "small" : logoSize],
            )}
            draggable={false}
          />
        ) : null}
        {titleBlock}
      </div>
      {closeButton}
    </div>
  );
}
