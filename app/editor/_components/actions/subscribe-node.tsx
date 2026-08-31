"use client";

import type { Node, NodeProps } from "@xyflow/react";
import { ChevronDown, Play, Plus, Radio, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActionNodeCard } from "@/app/editor/_components/actions/action-node-card";
import { useActionsEditor } from "@/app/editor/_components/actions/actions-editor-context";
import { VariableInsertButton } from "@/app/editor/_components/actions/variable-insert-button";
import { EditorButton } from "@/app/editor/_components/ui/editor-button";
import { IconButton } from "@/app/editor/_components/ui/icon-button";
import { SwitchField } from "@/app/editor/_components/ui/switch-field";
import {
  findOwnedActionNode,
  ownerKeyFor,
} from "@/lib/editor/actions/action-owners";
import type { ActionFlowNodeData } from "@/lib/editor/actions/flow-adapter";
import {
  clearHttpRequestCached,
  countHeaderRows,
  createEmptyHeaderRow,
  formatHttpResultPreview,
  headersJsonToRows,
  httpRequestCacheKey,
  rowsToHeadersJson,
  type HttpHeaderRow,
  type HttpRequestResult,
} from "@/lib/editor/actions/http-request";
import { insertTextAt } from "@/lib/editor/actions/interpolate-fields";
import {
  clampSubscribeIntervalMs,
  executeSubscribeGet,
  interpolateSubscribeFields,
  SUBSCRIBE_INTERVAL_MAX_MS,
  SUBSCRIBE_INTERVAL_MIN_MS,
  validateSubscribeData,
} from "@/lib/editor/actions/subscribe";
import { useOwnedActionNode } from "@/lib/editor/actions/use-owned-action-node";
import {
  fieldSourcesFromResponseJson,
  listAllFieldSources,
} from "@/lib/editor/blocks/http-field-sources";
import { useEditorStore } from "@/lib/editor/state/editor-store";
import { useScenesStore } from "@/lib/editor/state/scenes-store";
import { useSettingsStore } from "@/lib/editor/state/settings-store";
import type { SubscribeActionNode } from "@/lib/editor/types/hotspot-action";

export type SubscribeFlowNode = Node<ActionFlowNodeData, "subscribe">;

const EMPTY_DATA: SubscribeActionNode["data"] = {
  url: "",
  headersJson: "{\n  \n}",
  intervalMs: 5000,
  skipUnchanged: true,
  lastResponseJson: "",
};

function readSubscribeData(
  ownerId: number,
  actionNodeId: string,
): SubscribeActionNode["data"] {
  const node = findOwnedActionNode(ownerId, actionNodeId);
  if (!node || node.type !== "subscribe") return EMPTY_DATA;
  return {
    url: node.data.url,
    headersJson: node.data.headersJson,
    intervalMs: clampSubscribeIntervalMs(node.data.intervalMs),
    skipUnchanged: node.data.skipUnchanged !== false,
    lastResponseJson: node.data.lastResponseJson ?? "",
  };
}

export function SubscribeNode({
  data,
  selected,
}: NodeProps<SubscribeFlowNode>) {
  const { deleteNode, updateNodeData } = useActionsEditor();
  const actionNodeId = data.actionNode?.id;
  const ownerId = data.hotspotId;
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<HttpRequestResult | null>(null);
  const [headersOpen, setHeadersOpen] = useState(false);
  const [headerRows, setHeaderRows] = useState<HttpHeaderRow[]>([
    createEmptyHeaderRow(),
  ]);
  const [urlDraft, setUrlDraft] = useState(() =>
    actionNodeId ? readSubscribeData(ownerId, actionNodeId).url : "",
  );
  const urlFocusedRef = useRef(false);
  const urlRef = useRef<HTMLInputElement>(null);
  const headerValueRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const ownedNode = useOwnedActionNode(ownerId, actionNodeId);
  const live =
    ownedNode?.type === "subscribe"
      ? {
          url: ownedNode.data.url,
          headersJson: ownedNode.data.headersJson,
          intervalMs: clampSubscribeIntervalMs(ownedNode.data.intervalMs),
          skipUnchanged: ownedNode.data.skipUnchanged !== false,
          lastResponseJson: ownedNode.data.lastResponseJson ?? "",
        }
      : EMPTY_DATA;
  const hotspots = useEditorStore((s) => s.hotspots);
  const appStartActions = useScenesStore((s) => s.appStartActions);
  const sceneStartActions = useScenesStore((s) => {
    const scene =
      s.scenes.find((sc) => sc.id === s.activeSceneId) ?? s.scenes[0];
    return scene?.startActions ?? null;
  });
  const customMenuButtons = useSettingsStore((s) => s.customMenuButtons);
  const fieldSources = useMemo(
    () => listAllFieldSources(actionNodeId),
    [actionNodeId, appStartActions, hotspots, sceneStartActions, customMenuButtons],
  );
  const ownFieldSources = useMemo(
    () =>
      actionNodeId
        ? fieldSourcesFromResponseJson(live.lastResponseJson, {
            nodeId: actionNodeId,
            ownerId,
            nodeLabel: "This subscribe",
          }).map((source) => ({ ...source, kind: "subscribe" as const }))
        : [],
    [actionNodeId, live.lastResponseJson, ownerId],
  );

  useEffect(() => {
    if (!actionNodeId) return;
    const next = readSubscribeData(ownerId, actionNodeId);
    setHeaderRows(headersJsonToRows(next.headersJson));
    if (!urlFocusedRef.current) setUrlDraft(next.url);
  }, [actionNodeId, ownerId]);

  useEffect(() => {
    if (!urlFocusedRef.current) setUrlDraft(live.url);
  }, [live.url]);

  if (!actionNodeId) return null;

  const warning = validateSubscribeData(live);
  const cacheKey = httpRequestCacheKey(ownerKeyFor(ownerId), actionNodeId);
  const headerCount = countHeaderRows(live.headersJson);
  const intervalSeconds = Math.round(live.intervalMs / 1000);

  const patch = (partial: Partial<SubscribeActionNode["data"]>) => {
    updateNodeData(ownerId, actionNodeId, partial);
  };

  const patchRequestField = (
    partial: Partial<SubscribeActionNode["data"]>,
  ) => {
    const shouldInvalidate =
      (typeof partial.url === "string" && partial.url !== live.url) ||
      (typeof partial.headersJson === "string" &&
        partial.headersJson !== live.headersJson);

    if (shouldInvalidate) {
      clearHttpRequestCached(cacheKey);
      setTestResult(null);
    }

    patch({
      ...partial,
      ...(shouldInvalidate && live.lastResponseJson
        ? { lastResponseJson: "" }
        : null),
    });
  };

  const commitUrl = (next: string) => {
    setUrlDraft(next);
    if (next !== live.url) patchRequestField({ url: next });
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
  const fieldClass = "editor-input nodrag nopan nowheel";

  const insertInto = (
    current: string,
    token: string,
    el: HTMLInputElement | null,
  ) => {
    if (!el) return insertTextAt(current, token, current.length);
    return insertTextAt(
      current,
      token,
      el.selectionStart ?? current.length,
      el.selectionEnd ?? current.length,
    );
  };

  const handleTest = async () => {
    const current = readSubscribeData(ownerId, actionNodeId);
    const interpolated = interpolateSubscribeFields(current);
    const error = validateSubscribeData({
      ...current,
      ...interpolated,
    });
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
      clearHttpRequestCached(cacheKey);
      if (live.lastResponseJson) patch({ lastResponseJson: "" });
      return;
    }
    setTesting(true);
    try {
      const result = await executeSubscribeGet(interpolated);
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
      label="Subscribe"
      icon={Radio}
      accent="#4cc9f0"
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
          <div className="flex w-full items-center justify-between gap-2">
            <div
              className="min-w-0 flex-1 text-[10px]"
              style={{ color: "var(--editor-teal)" }}
            >
              every {intervalSeconds}s
              {live.skipUnchanged ? " · skip unchanged" : ""}
            </div>
            <VariableInsertButton
              sources={ownFieldSources}
              title="View response fields"
              emptyTitle="Test this subscribe to list fields"
            />
          </div>
        ) : (
          <div className="text-[10px]" style={{ color: "var(--editor-muted)" }}>
            every {intervalSeconds}s · GET poll in Preview
          </div>
        )
      }
    >
      <div className="space-y-2.5">
        <label className="block min-w-0">
          <span
            className="mb-1 block text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: "var(--editor-muted-2)" }}
          >
            URL
          </span>
          <div className="editor-var-field">
            <input
              ref={urlRef}
              className={fieldClass}
              type="text"
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
              placeholder="https://api.example.com/…"
              value={urlDraft}
              onFocus={() => {
                urlFocusedRef.current = true;
                setUrlDraft(live.url);
              }}
              onChange={(e) => commitUrl(e.target.value)}
              onBlur={(e) => {
                urlFocusedRef.current = false;
                commitUrl(e.currentTarget.value);
              }}
              {...stop}
            />
            <VariableInsertButton
              sources={fieldSources}
              onInsert={(token) => {
                const next = insertInto(urlDraft, token, urlRef.current);
                commitUrl(next);
                requestAnimationFrame(() => urlRef.current?.focus());
              }}
            />
          </div>
        </label>

        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span
              className="mb-1 block text-[10px] font-semibold uppercase tracking-wider"
              style={{ color: "var(--editor-muted-2)" }}
            >
              Interval (s)
            </span>
            <input
              className={fieldClass}
              type="number"
              min={SUBSCRIBE_INTERVAL_MIN_MS / 1000}
              max={SUBSCRIBE_INTERVAL_MAX_MS / 1000}
              step={1}
              value={intervalSeconds}
              onChange={(e) => {
                const seconds = Number(e.target.value);
                patch({
                  intervalMs: clampSubscribeIntervalMs(seconds * 1000),
                });
              }}
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
                    className={fieldClass}
                    placeholder="Key"
                    value={row.key}
                    onChange={(e) =>
                      updateHeaderRow(row.id, "key", e.target.value)
                    }
                    {...stop}
                  />
                  <div className="editor-var-field">
                    <input
                      ref={(el) => {
                        headerValueRefs.current[row.id] = el;
                      }}
                      className={fieldClass}
                      placeholder="Value"
                      value={row.value}
                      onChange={(e) =>
                        updateHeaderRow(row.id, "value", e.target.value)
                      }
                      {...stop}
                    />
                    <VariableInsertButton
                      sources={fieldSources}
                      onInsert={(token) => {
                        const el = headerValueRefs.current[row.id];
                        updateHeaderRow(
                          row.id,
                          "value",
                          insertInto(row.value, token, el),
                        );
                        requestAnimationFrame(() => el?.focus());
                      }}
                    />
                  </div>
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

        <div
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <SwitchField
            label="Skip unchanged"
            description="Do not re-run the chain when JSON is identical"
            checked={live.skipUnchanged}
            onChange={(checked) => patch({ skipUnchanged: checked })}
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
