"use client";

import type { Node, NodeProps } from "@xyflow/react";
import { ChevronDown, Globe, Play, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { ActionNodeCard } from "@/app/editor/_components/actions/action-node-card";
import { useActionsEditor } from "@/app/editor/_components/actions/actions-editor-context";
import { EditorButton } from "@/app/editor/_components/ui/editor-button";
import { IconButton } from "@/app/editor/_components/ui/icon-button";
import { SwitchField } from "@/app/editor/_components/ui/switch-field";
import {
  APP_START_OWNER_ID,
  isHotspotOwnerId,
  ownerKeyFor,
} from "@/lib/editor/actions/action-owners";
import type { ActionFlowNodeData } from "@/lib/editor/actions/flow-adapter";
import {
  clearHttpRequestCached,
  countHeaderRows,
  createEmptyHeaderRow,
  executeHttpRequest,
  formatHttpResultPreview,
  headersJsonToRows,
  httpRequestCacheKey,
  rowsToHeadersJson,
  type HttpHeaderRow,
  type HttpRequestResult,
  validateHttpRequestData,
} from "@/lib/editor/actions/http-request";
import { useEditorStore } from "@/lib/editor/state/editor-store";
import { useScenesStore } from "@/lib/editor/state/scenes-store";
import {
  HTTP_METHODS,
  type HttpMethod,
  type HttpRequestActionNode,
} from "@/lib/editor/types/hotspot-action";

export type HttpRequestFlowNode = Node<ActionFlowNodeData, "httpRequest">;

const EMPTY_DATA: HttpRequestActionNode["data"] = {
  method: "GET",
  url: "",
  headersJson: "{\n  \n}",
  body: "",
  cacheReuse: false,
  lastResponseJson: "",
};

function readHttpData(
  ownerId: number,
  actionNodeId: string,
): HttpRequestActionNode["data"] {
  if (isHotspotOwnerId(ownerId)) {
    const hotspot = useEditorStore
      .getState()
      .hotspots.find((h) => h.id === ownerId);
    const node = hotspot?.actions?.nodes.find((n) => n.id === actionNodeId);
    if (!node || node.type !== "httpRequest") return EMPTY_DATA;
    return {
      method: node.data.method,
      url: node.data.url,
      headersJson: node.data.headersJson,
      body: node.data.body,
      cacheReuse: node.data.cacheReuse,
      lastResponseJson: node.data.lastResponseJson ?? "",
    };
  }

  const scenes = useScenesStore.getState();
  const graph =
    ownerId === APP_START_OWNER_ID
      ? scenes.appStartActions
      : (scenes.scenes.find((s) => s.id === scenes.activeSceneId)?.startActions ??
        null);
  const node = graph?.nodes.find((n) => n.id === actionNodeId);
  if (!node || node.type !== "httpRequest") return EMPTY_DATA;
  return {
    method: node.data.method,
    url: node.data.url,
    headersJson: node.data.headersJson,
    body: node.data.body,
    cacheReuse: node.data.cacheReuse,
    lastResponseJson: node.data.lastResponseJson ?? "",
  };
}

export function HttpRequestNode({
  data,
  selected,
}: NodeProps<HttpRequestFlowNode>) {
  const { deleteNode, updateNodeData } = useActionsEditor();
  const actionNodeId = data.actionNode?.id;
  const ownerId = data.hotspotId;
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<HttpRequestResult | null>(null);
  const [headersOpen, setHeadersOpen] = useState(false);
  const [headerRows, setHeaderRows] = useState<HttpHeaderRow[]>([
    createEmptyHeaderRow(),
  ]);

  const hotspotLive = useEditorStore(
    useShallow((s) => {
      if (!actionNodeId || !isHotspotOwnerId(ownerId)) return EMPTY_DATA;
      const hotspot = s.hotspots.find((h) => h.id === ownerId);
      const node = hotspot?.actions?.nodes.find((n) => n.id === actionNodeId);
      if (!node || node.type !== "httpRequest") return EMPTY_DATA;
      return {
        method: node.data.method,
        url: node.data.url,
        headersJson: node.data.headersJson,
        body: node.data.body,
        cacheReuse: node.data.cacheReuse,
        lastResponseJson: node.data.lastResponseJson ?? "",
      };
    }),
  );

  const startLive = useScenesStore(
    useShallow((s) => {
      if (!actionNodeId || isHotspotOwnerId(ownerId)) return EMPTY_DATA;
      const graph =
        ownerId === APP_START_OWNER_ID
          ? s.appStartActions
          : (s.scenes.find((sc) => sc.id === s.activeSceneId)?.startActions ??
            null);
      const node = graph?.nodes.find((n) => n.id === actionNodeId);
      if (!node || node.type !== "httpRequest") return EMPTY_DATA;
      return {
        method: node.data.method,
        url: node.data.url,
        headersJson: node.data.headersJson,
        body: node.data.body,
        cacheReuse: node.data.cacheReuse,
        lastResponseJson: node.data.lastResponseJson ?? "",
      };
    }),
  );

  const live = isHotspotOwnerId(ownerId) ? hotspotLive : startLive;

  useEffect(() => {
    if (!actionNodeId) return;
    setHeaderRows(headersJsonToRows(readHttpData(ownerId, actionNodeId).headersJson));
  }, [actionNodeId, ownerId]);

  if (!actionNodeId) return null;

  const warning = validateHttpRequestData(live);
  const cacheKey = httpRequestCacheKey(ownerKeyFor(ownerId), actionNodeId);
  const headerCount = countHeaderRows(live.headersJson);

  const patch = (partial: Partial<HttpRequestActionNode["data"]>) => {
    updateNodeData(ownerId, actionNodeId, partial);
  };

  const invalidateResponse = () => {
    clearHttpRequestCached(cacheKey);
    if (live.lastResponseJson) {
      patch({ lastResponseJson: "" });
    }
    setTestResult(null);
  };

  const patchRequestField = (
    partial: Partial<HttpRequestActionNode["data"]>,
  ) => {
    clearHttpRequestCached(cacheKey);
    patch({
      ...partial,
      lastResponseJson: "",
    });
    setTestResult(null);
  };

  const commitHeaderRows = (rows: HttpHeaderRow[]) => {
    setHeaderRows(rows);
    patchRequestField({ headersJson: rowsToHeadersJson(rows) });
  };

  const updateHeaderRow = (
    id: string,
    field: "key" | "value",
    value: string,
  ) => {
    commitHeaderRows(
      headerRows.map((row) => (row.id === id ? { ...row, [field]: value } : row)),
    );
  };

  const addHeaderRow = () => {
    commitHeaderRows([...headerRows, createEmptyHeaderRow()]);
  };

  const removeHeaderRow = (id: string) => {
    const next = headerRows.filter((row) => row.id !== id);
    commitHeaderRows(next.length > 0 ? next : [createEmptyHeaderRow()]);
  };

  const stop = {
    onPointerDown: (e: React.PointerEvent) => e.stopPropagation(),
    onClick: (e: React.MouseEvent) => e.stopPropagation(),
    onKeyDown: (e: React.KeyboardEvent) => e.stopPropagation(),
  };

  const showBody = live.method !== "GET" && live.method !== "HEAD";

  const handleTest = async () => {
    const current = readHttpData(ownerId, actionNodeId);
    const error = validateHttpRequestData(current);
    if (error) {
      setTestResult({
        ok: false,
        status: null,
        statusText: "",
        durationMs: 0,
        headers: {},
        body: "",
        error,
        json: undefined,
      });
      invalidateResponse();
      return;
    }
    setTesting(true);
    try {
      const result = await executeHttpRequest(current);
      setTestResult(result);
      if (result.ok && result.json !== undefined) {
        patch({ lastResponseJson: JSON.stringify(result.json) });
      } else {
        clearHttpRequestCached(cacheKey);
        patch({ lastResponseJson: "" });
      }
    } finally {
      setTesting(false);
    }
  };

  const hasFieldSources = Boolean(live.lastResponseJson.trim());

  return (
    <ActionNodeCard
      label="HTTP Request"
      icon={Globe}
      accent="#56c8a0"
      selected={selected}
      wide
      onDelete={() => deleteNode(ownerId, actionNodeId)}
      footer={
        warning ? (
          <div
            className="text-[10px] font-medium"
            style={{ color: "var(--editor-amber)" }}
          >
            {warning}
          </div>
        ) : hasFieldSources ? (
          <div className="text-[10px]" style={{ color: "var(--editor-teal)" }}>
            Response fields available in Text blocks
          </div>
        ) : live.cacheReuse ? (
          <div className="text-[10px]" style={{ color: "var(--editor-muted)" }}>
            Cache reuse on — runs once per preview session
          </div>
        ) : null
      }
    >
      <div className="space-y-2.5">
        <div className="grid grid-cols-[88px_1fr] gap-2">
          <label className="block">
            <span
              className="mb-1 block text-[10px] font-semibold uppercase tracking-wider"
              style={{ color: "var(--editor-muted-2)" }}
            >
              Method
            </span>
            <select
              className="editor-select"
              value={live.method}
              onChange={(e) =>
                patchRequestField({ method: e.target.value as HttpMethod })
              }
              {...stop}
            >
              {HTTP_METHODS.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </select>
          </label>
          <label className="block min-w-0">
            <span
              className="mb-1 block text-[10px] font-semibold uppercase tracking-wider"
              style={{ color: "var(--editor-muted-2)" }}
            >
              URL
            </span>
            <input
              className="editor-input"
              type="url"
              placeholder="https://api.example.com/…"
              value={live.url}
              onChange={(e) => patchRequestField({ url: e.target.value })}
              {...stop}
            />
          </label>
        </div>

        <div className="editor-http-headers">
          <button
            type="button"
            className="editor-http-headers-toggle"
            aria-expanded={headersOpen}
            onClick={(e) => {
              e.stopPropagation();
              setHeadersOpen((v) => !v);
            }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <span>
              Headers
              {headerCount > 0 ? (
                <span
                  className="ml-1.5 normal-case tracking-normal"
                  style={{ color: "var(--editor-muted)" }}
                >
                  ({headerCount})
                </span>
              ) : null}
            </span>
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform ${headersOpen ? "rotate-180" : ""}`}
            />
          </button>
          {headersOpen ? (
            <div className="editor-http-headers-list mt-1.5 space-y-1.5">
              {headerRows.map((row) => (
                <div key={row.id} className="editor-http-header-row">
                  <input
                    className="editor-input"
                    placeholder="Key"
                    value={row.key}
                    onChange={(e) =>
                      updateHeaderRow(row.id, "key", e.target.value)
                    }
                    {...stop}
                  />
                  <input
                    className="editor-input"
                    placeholder="Value"
                    value={row.value}
                    onChange={(e) =>
                      updateHeaderRow(row.id, "value", e.target.value)
                    }
                    {...stop}
                  />
                  <IconButton
                    title="Remove header"
                    style={{ width: 28, height: 28 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      removeHeaderRow(row.id);
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </IconButton>
                </div>
              ))}
              <button
                type="button"
                className="editor-http-headers-add"
                onClick={(e) => {
                  e.stopPropagation();
                  addHeaderRow();
                }}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <Plus className="h-3.5 w-3.5" />
                Add header
              </button>
            </div>
          ) : null}
        </div>

        {showBody ? (
          <label className="block">
            <span
              className="mb-1 block text-[10px] font-semibold uppercase tracking-wider"
              style={{ color: "var(--editor-muted-2)" }}
            >
              Body
            </span>
            <textarea
              className="editor-textarea editor-textarea-compact"
              rows={3}
              spellCheck={false}
              placeholder='{ "hello": "world" }'
              value={live.body}
              onChange={(e) => patchRequestField({ body: e.target.value })}
              {...stop}
            />
          </label>
        ) : null}

        <div
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <SwitchField
            label="Cache reuse"
            description="In Preview, run this request only once"
            checked={live.cacheReuse}
            onChange={(checked) => patch({ cacheReuse: checked })}
          />
        </div>

        <EditorButton
          className="w-full justify-center text-[12px]"
          disabled={testing}
          onClick={(e) => {
            e.stopPropagation();
            void handleTest();
          }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <Play className="h-3.5 w-3.5" />
          {testing ? "Testing…" : "Test"}
        </EditorButton>

        {testResult ? (
          <div className="editor-http-test-result">
            <div className="mb-1 flex items-center justify-between gap-2">
              <span
                className="text-[10px] font-semibold uppercase tracking-wider"
                style={{ color: "var(--editor-muted-2)" }}
              >
                Test result
              </span>
              <span
                className="text-[10px] font-semibold"
                style={{
                  color: testResult.ok
                    ? "var(--editor-teal)"
                    : "var(--editor-amber)",
                }}
              >
                {testResult.error && testResult.status == null
                  ? "Error"
                  : `${testResult.status ?? "—"} ${testResult.statusText}`.trim()}
              </span>
            </div>
            <pre>{formatHttpResultPreview(testResult)}</pre>
          </div>
        ) : null}
      </div>
    </ActionNodeCard>
  );
}
