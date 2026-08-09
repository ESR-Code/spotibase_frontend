"use client";

import { useMemo } from "react";
import { resolveHttpFieldsInHtml } from "@/lib/editor/blocks/http-field-chip";
import { getValueByPath, tryParseJson } from "@/lib/editor/blocks/json-paths";
import { normalizeRichTextContent } from "@/lib/editor/blocks/rich-text";
import { getActionGraph } from "@/lib/editor/actions/create-action-graph";
import { httpRequestCacheKey } from "@/lib/editor/actions/http-request";
import { useEditorStore } from "@/lib/editor/state/editor-store";
import { useHttpResponseStore } from "@/lib/editor/state/http-response-store";
import type { TextBlock } from "@/lib/editor/types/hotspot-block";

type TextBlockPreviewProps = {
  block: TextBlock;
  hotspotId?: number;
};

export function TextBlockPreview({ block, hotspotId }: TextBlockPreviewProps) {
  const hotspot = useEditorStore((s) =>
    hotspotId != null ? s.hotspots.find((h) => h.id === hotspotId) ?? null : null,
  );
  const runtimeResponses = useHttpResponseStore((s) => s.byKey);

  const html = useMemo(() => {
    const base = normalizeRichTextContent(block.content);
    if (!base || !hotspotId || !hotspot) return base;

    return resolveHttpFieldsInHtml(base, (nodeId, path) => {
      const key = httpRequestCacheKey(hotspotId, nodeId);
      if (Object.prototype.hasOwnProperty.call(runtimeResponses, key)) {
        return getValueByPath(runtimeResponses[key], path);
      }

      const node = getActionGraph(hotspot).nodes.find((n) => n.id === nodeId);
      if (node?.type !== "httpRequest") return undefined;
      const sample = tryParseJson(node.data.lastResponseJson ?? "");
      if (sample === undefined) return undefined;
      return getValueByPath(sample, path);
    });
  }, [block.content, hotspot, hotspotId, runtimeResponses]);

  if (!html) return null;

  return (
    <div
      className="editor-rich-text-preview"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
