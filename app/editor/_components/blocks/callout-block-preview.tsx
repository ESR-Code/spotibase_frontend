"use client";

import { createElement, type ReactNode } from "react";
import { calloutTone, resolveCalloutIcon } from "@/lib/editor/blocks/callout";
import { useInterpolatedPlainText } from "@/lib/editor/blocks/use-interpolated-plain-text";
import { getCategoryLucideIcon } from "@/lib/editor/theme/category-icons";
import type {
  CalloutBlock,
  CalloutTone,
} from "@/lib/editor/types/hotspot-block";

/** The callout box. Preview and the block editor both render this, so they match. */
export function CalloutFrame({
  tone,
  badge,
  children,
}: {
  tone: CalloutTone;
  badge: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="editor-callout-block" data-tone={tone} role="note">
      {badge}
      <div className="editor-callout-block-body">{children}</div>
    </div>
  );
}

export function CalloutBadge({ block }: { block: Pick<CalloutBlock, "tone" | "icon"> }) {
  return (
    <span
      className="editor-category-option-icon editor-callout-block-badge"
      style={{ background: calloutTone(block.tone).color }}
      aria-hidden
    >
      {createElement(getCategoryLucideIcon(resolveCalloutIcon(block)), {
        className: "h-3 w-3",
      })}
    </span>
  );
}

export function CalloutBlockPreview({ block }: { block: CalloutBlock }) {
  const title = useInterpolatedPlainText(block.title).trim();
  const content = useInterpolatedPlainText(block.content).trim();
  if (!title && !content) return null;
  return (
    <CalloutFrame tone={block.tone} badge={<CalloutBadge block={block} />}>
      {title ? <div className="editor-callout-block-title">{title}</div> : null}
      {content ? <div className="editor-callout-block-text">{content}</div> : null}
    </CalloutFrame>
  );
}
