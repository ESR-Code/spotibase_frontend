"use client";

import { useMemo } from "react";
import {
  findHttpRequestNodeById,
  ownerKeyFor,
} from "@/lib/editor/actions/action-owners";
import { httpRequestCacheKey } from "@/lib/editor/actions/http-request";
import { resolveHttpFieldsInHtml } from "@/lib/editor/blocks/http-field-chip";
import { getValueByPath, tryParseJson } from "@/lib/editor/blocks/json-paths";
import { normalizeRichTextContent } from "@/lib/editor/blocks/rich-text";
import { useEditorStore } from "@/lib/editor/state/editor-store";
import { useHttpResponseStore } from "@/lib/editor/state/http-response-store";
import { useScenesStore } from "@/lib/editor/state/scenes-store";
import type { TextBlock } from "@/lib/editor/types/hotspot-block";

type TextBlockPreviewProps = {
  block: TextBlock;
  hotspotId?: number;
};

export function TextBlockPreview({ block, hotspotId }: TextBlockPreviewProps) {
  const hotspot = useEditorStore((s) =>
    hotspotId != null ? (s.hotspots.find((h) => h.id === hotspotId) ?? null) : null,
  );
  const appStartActions = useScenesStore((s) => s.appStartActions);
  const sceneStartActions = useScenesStore((s) => {
    const scene =
      s.scenes.find((sc) => sc.id === s.activeSceneId) ?? s.scenes[0];
    return scene?.startActions ?? null;
  });
  const runtimeResponses = useHttpResponseStore((s) => s.byKey);

  const html = useMemo(() => {
    const base = normalizeRichTextContent(block.content);
    if (!base) return base;

    return resolveHttpFieldsInHtml(base, (nodeId, path) => {
      const found = findHttpRequestNodeById(nodeId);
      if (!found) return undefined;

      const key = httpRequestCacheKey(
        ownerKeyFor(found.ownerId),
        found.node.id,
      );
      if (Object.prototype.hasOwnProperty.call(runtimeResponses, key)) {
        return getValueByPath(runtimeResponses[key], path);
      }

      const sample = tryParseJson(found.sampleJson);
      if (sample === undefined) return undefined;
      return getValueByPath(sample, path);
    });
  }, [
    appStartActions,
    block.content,
    hotspot,
    hotspotId,
    runtimeResponses,
    sceneStartActions,
  ]);

  if (!html) return null;

  return (
    <div
      className="editor-rich-text-preview"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
