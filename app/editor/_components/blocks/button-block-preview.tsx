"use client";

import { createElement, type ReactNode } from "react";
import { runContentButtonActions } from "@/lib/editor/actions/run-action-graph";
import { resolveButtonBlockColor } from "@/lib/editor/blocks/button-colors";
import { useInterpolatedPlainText } from "@/lib/editor/blocks/use-interpolated-plain-text";
import { getCategoryLucideIcon } from "@/lib/editor/theme/category-icons";
import type {
  ButtonBlock,
  ButtonBlockColor,
} from "@/lib/editor/types/hotspot-block";

type ButtonFrameProps = {
  color: ButtonBlockColor;
  /** Leading icon (static, or the icon picker while editing). */
  icon: ReactNode;
  children: ReactNode;
  /** Set in Preview: renders a real <button>. Omitted while editing (a <div>, so fields can live inside). */
  onClick?: () => void;
};

/** The button box. Preview and the block editor both render this, so they match. */
export function ButtonFrame({ color, icon, children, onClick }: ButtonFrameProps) {
  const className = `editor-btn editor-content-button ${color === "accent" ? "editor-btn-primary" : ""} ${onClick ? "" : "is-editing"}`;
  const content = (
    <>
      {icon}
      <span className="editor-content-button-text">{children}</span>
    </>
  );
  return onClick ? (
    <button type="button" className={className} data-color={color} onClick={onClick}>
      {content}
    </button>
  ) : (
    <div className={className} data-color={color}>
      {content}
    </div>
  );
}

export function ButtonIcon({ name }: { name: string }) {
  return createElement(getCategoryLucideIcon(name), {
    className: "h-4 w-4 shrink-0",
    "aria-hidden": true,
  });
}

type ButtonBlockPreviewProps = {
  block: ButtonBlock;
  hotspotId?: number;
};

export function ButtonBlockPreview({
  block,
  hotspotId,
}: ButtonBlockPreviewProps) {
  const label =
    useInterpolatedPlainText(block.label).trim() || "Action button";
  const description = useInterpolatedPlainText(block.description).trim();

  return (
    <ButtonFrame
      color={resolveButtonBlockColor(block.color)}
      icon={<ButtonIcon name={block.icon} />}
      onClick={() => {
        // No hotspot = the button sits in a scene dialog.
        void runContentButtonActions(block.ownerId, hotspotId ?? null);
      }}
    >
      <span className="editor-content-button-label">{label}</span>
      {description ? (
        <span className="editor-content-button-desc">{description}</span>
      ) : null}
    </ButtonFrame>
  );
}
