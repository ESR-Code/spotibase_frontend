"use client";

import type { Node, NodeProps } from "@xyflow/react";
import { Globe, Play } from "lucide-react";
import { useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { ActionNodeCard } from "@/app/editor/_components/actions/action-node-card";
import { useActionsEditor } from "@/app/editor/_components/actions/actions-editor-context";
import { EditorButton } from "@/app/editor/_components/ui/editor-button";
import { SwitchField } from "@/app/editor/_components/ui/switch-field";
import type { ActionFlowNodeData } from "@/lib/editor/actions/flow-adapter";
import {
  executeHttpRequest,
  formatHttpResultPreview,
  parseHeadersJson,
  type HttpRequestResult,
  validateHttpRequestData,
} from "@/lib/editor/actions/http-request";
import { useEditorStore } from "@/lib/editor/state/editor-store";
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

export function HttpRequestNode({
  data,
  selected,
}: NodeProps<HttpRequestFlowNode>) {
  const { deleteNode, updateNodeData } = useActionsEditor();
  const actionNodeId = data.actionNode?.id;
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<HttpRequestResult | null>(null);

  const live = useEditorStore(
    useShallow((s) => {
      if (!actionNodeId) return EMPTY_DATA;
      const hotspot = s.hotspots.find((h) => h.id === data.hotspotId);
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

  if (!actionNodeId) return null;

  const headersCheck = parseHeadersJson(live.headersJson);
  const warning = validateHttpRequestData(live);

  const patch = (partial: Partial<HttpRequestActionNode["data"]>) => {
    updateNodeData(data.hotspotId, actionNodeId, partial);
  };

  const stop = {
    onPointerDown: (e: React.PointerEvent) => e.stopPropagation(),
    onClick: (e: React.MouseEvent) => e.stopPropagation(),
    onKeyDown: (e: React.KeyboardEvent) => e.stopPropagation(),
  };

  const showBody = live.method !== "GET" && live.method !== "HEAD";

  const handleTest = async () => {
    const error = validateHttpRequestData(live);
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
      return;
    }
    setTesting(true);
    try {
      const result = await executeHttpRequest(live);
      setTestResult(result);
      // Persist JSON so Text blocks can offer response fields.
      patch({
        lastResponseJson:
          result.json !== undefined ? JSON.stringify(result.json) : "",
      });
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
      onDelete={() => deleteNode(data.hotspotId, actionNodeId)}
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
                patch({ method: e.target.value as HttpMethod })
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
              onChange={(e) => patch({ url: e.target.value })}
              {...stop}
            />
          </label>
        </div>

        <label className="block">
          <span
            className="mb-1 block text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: "var(--editor-muted-2)" }}
          >
            Headers (JSON)
          </span>
          <textarea
            className="editor-textarea editor-textarea-compact"
            rows={3}
            spellCheck={false}
            placeholder='{ "Content-Type": "application/json" }'
            value={live.headersJson}
            onChange={(e) => patch({ headersJson: e.target.value })}
            {...stop}
          />
          {!headersCheck.ok ? (
            <span
              className="mt-1 block text-[10px]"
              style={{ color: "var(--editor-amber)" }}
            >
              {headersCheck.error}
            </span>
          ) : null}
        </label>

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
              onChange={(e) => patch({ body: e.target.value })}
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
