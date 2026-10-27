import { isAssetRef, isMissingAssetRef } from "@/lib/editor/assets";
import { hasFieldTokens } from "@/lib/editor/actions/interpolate-fields";
import { chainFromTrigger } from "@/lib/editor/actions/graph-ops";
import { iframeUrlError } from "@/lib/editor/blocks/embed-iframe-url";
import { parseEmbedVideoUrl } from "@/lib/editor/blocks/embed-video-url";
import { richTextToPlainPreview } from "@/lib/editor/blocks/rich-text";
import { normalizeExternalUrl } from "@/lib/editor/utils/open-external-url";
import type { HotspotBlock } from "@/lib/editor/types/hotspot-block";

/**
 * First authoring problem in a block, shown on its card in the Blocks tab, or
 * null. Values with `{{tokens}}` are only checked for being non-empty: they
 * resolve at run time. Missing library assets are read from the assets store,
 * so callers re-render on library changes.
 */
export function validateBlock(block: HotspotBlock): string | null {
  switch (block.type) {
    case "heading":
      return block.content.trim() ? null : "Heading is empty";
    case "text":
      return richTextToPlainPreview(block.content) ? null : "Text is empty";
    case "link":
      if (!block.url.trim()) return "Add a URL";
      if (hasFieldTokens(block.url)) return null;
      return normalizeExternalUrl(block.url) ? null : "URL is not valid";
    case "image": {
      if (block.items.length === 0) return "Add at least one image";
      const index = block.items.findIndex((item) => !item.src.trim());
      if (index >= 0) return `Image ${index + 1} has no source`;
      const missing = block.items.findIndex((item) => isMissingAssetRef(item.src));
      if (missing >= 0) return `Image ${missing + 1} is missing from the library`;
      return null;
    }
    case "video":
      if (!block.url.trim()) return "Add a YouTube or Vimeo URL";
      if (hasFieldTokens(block.url)) return null;
      return parseEmbedVideoUrl(block.url)
        ? null
        : "Only YouTube or Vimeo links are supported";
    case "button":
      return chainFromTrigger(block.actions).length > 0
        ? null
        : "No actions yet — wire it in the Actions tab";
    case "file":
      if (!block.src.trim()) return "Upload a file or add a URL";
      if (isMissingAssetRef(block.src)) return "File is missing from the library";
      if (isAssetRef(block.src) || hasFieldTokens(block.src)) return null;
      return normalizeExternalUrl(block.src) ? null : "URL is not valid";
    case "iframe":
      if (!block.url.trim()) return "Add a page URL";
      if (hasFieldTokens(block.url)) return null;
      return iframeUrlError(block.url);
    case "callout":
      return block.title.trim() || block.content.trim()
        ? null
        : "Callout is empty";
    case "divider":
      return null;
  }
}
