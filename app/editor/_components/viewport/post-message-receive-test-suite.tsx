"use client";

import { ChevronDown, MessagesSquare, Send, X } from "lucide-react";
import { useEffect, useMemo } from "react";
import { EditorButton } from "@/app/editor/_components/ui/editor-button";
import { FieldLabel } from "@/app/editor/_components/ui/field-label";
import { GlassPanel } from "@/app/editor/_components/ui/glass-panel";
import { IconButton } from "@/app/editor/_components/ui/icon-button";
import {
  listActiveReceiveTestNodes,
  listEnabledReceiveTestEvents,
} from "@/lib/editor/actions/post-message-receive-test";
import {
  injectPostMessageReceiveTest,
  parsePayloadJson,
} from "@/lib/editor/actions/send-post-message";
import { useEditorStore } from "@/lib/editor/state/editor-store";
import { usePreviewPostMessageTestStore } from "@/lib/editor/state/preview-post-message-test-store";
import { useScenesStore } from "@/lib/editor/state/scenes-store";

function formatPayloadPreview(value: unknown, fallback: string): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return fallback;
  }
}

export function PostMessageReceiveTestSuite() {
  const isPreview = useEditorStore((s) => s.isPreview);
  const enabledKeys = usePreviewPostMessageTestStore((s) => s.enabledKeys);
  const panelOpen = usePreviewPostMessageTestStore((s) => s.panelOpen);
  const logs = usePreviewPostMessageTestStore((s) => s.logs);
  const eventName = usePreviewPostMessageTestStore((s) => s.eventName);
  const payloadJson = usePreviewPostMessageTestStore((s) => s.payloadJson);
  const setEventName = usePreviewPostMessageTestStore((s) => s.setEventName);
  const setPayloadJson = usePreviewPostMessageTestStore((s) => s.setPayloadJson);
  const togglePanel = usePreviewPostMessageTestStore((s) => s.togglePanel);
  const setPanelOpen = usePreviewPostMessageTestStore((s) => s.setPanelOpen);
  const appendLog = usePreviewPostMessageTestStore((s) => s.appendLog);
  const appStartActions = useScenesStore((s) => s.appStartActions);
  const sceneStartActions = useScenesStore((s) => {
    const scene =
      s.scenes.find((sc) => sc.id === s.activeSceneId) ?? s.scenes[0];
    return scene?.startActions ?? null;
  });

  const activeNodes = useMemo(
    () => listActiveReceiveTestNodes(),
    [enabledKeys, appStartActions, sceneStartActions],
  );
  const eventOptions = useMemo(
    () => listEnabledReceiveTestEvents(),
    [enabledKeys, appStartActions, sceneStartActions],
  );

  useEffect(() => {
    if (eventName.trim() || eventOptions.length === 0) return;
    setEventName(eventOptions[0]!.eventName);
  }, [eventName, eventOptions, setEventName]);

  if (!isPreview || activeNodes.length === 0) return null;

  const handleSend = () => {
    const parsed = parsePayloadJson(payloadJson);
    if (!parsed.ok) {
      appendLog({
        ok: false,
        eventName,
        body: payloadJson,
        error: parsed.error,
      });
      return;
    }
    const error = injectPostMessageReceiveTest(eventName, payloadJson);
    const body = formatPayloadPreview(parsed.value, payloadJson);
    if (error) {
      appendLog({ ok: false, eventName, body, error });
      return;
    }
    appendLog({ ok: true, eventName, body });
  };

  return (
    <div className="editor-pm-test-suite absolute bottom-4 right-4 z-10">
      {panelOpen ? (
        <GlassPanel className="editor-pm-test-panel flex w-[300px] flex-col">
          <div className="editor-pm-test-header">
            <span className="editor-pm-test-badge">Test</span>
            <span className="min-w-0 flex-1 truncate text-[12px] font-semibold">
              Post Message receive
            </span>
            <IconButton
              title="Collapse tester"
              style={{ width: 24, height: 24 }}
              onClick={() => setPanelOpen(false)}
            >
              <X className="h-3 w-3" />
            </IconButton>
          </div>

          <div className="space-y-2.5 p-3">
            <div>
              <FieldLabel htmlFor="editor-pm-test-event">Event name</FieldLabel>
              <input
                id="editor-pm-test-event"
                className="editor-input"
                list="editor-pm-test-events"
                placeholder="e.g. app:ready"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
              />
              {eventOptions.length > 0 ? (
                <datalist id="editor-pm-test-events">
                  {eventOptions.map((option) => (
                    <option
                      key={`${option.key}:${option.eventId}`}
                      value={option.eventName}
                    />
                  ))}
                </datalist>
              ) : null}
            </div>

            <div>
              <FieldLabel htmlFor="editor-pm-test-payload">Payload (JSON)</FieldLabel>
              <textarea
                id="editor-pm-test-payload"
                className="editor-textarea editor-textarea-compact"
                rows={4}
                spellCheck={false}
                placeholder='{ "userId": "1" }'
                value={payloadJson}
                onChange={(e) => setPayloadJson(e.target.value)}
              />
            </div>

            <EditorButton
              className="w-full justify-center text-[12px]"
              onClick={handleSend}
            >
              <Send className="h-3.5 w-3.5" />
              Send to app
            </EditorButton>

            <div className="editor-http-test-result editor-pm-test-log">
              <div
                className="mb-1 text-[10px] font-semibold uppercase tracking-wider"
                style={{ color: "var(--editor-muted-2)" }}
              >
                Log
              </div>
              {logs.length === 0 ? (
                <p
                  className="text-[10px] leading-relaxed"
                  style={{ color: "var(--editor-muted)" }}
                >
                  Injected receives appear here. Downstream nodes run if a
                  listener matches.
                </p>
              ) : (
                <ul className="space-y-2">
                  {logs.map((entry) => (
                    <li key={entry.id}>
                      <div className="mb-0.5 flex items-center justify-between gap-2">
                        <span className="truncate text-[10px] font-semibold">
                          ← {entry.eventName.trim() || "(unnamed)"}
                        </span>
                        <span
                          className="shrink-0 text-[10px] font-semibold"
                          style={{
                            color: entry.ok
                              ? "var(--editor-teal)"
                              : "var(--editor-amber)",
                          }}
                        >
                          {entry.ok ? "Sent" : entry.error || "Error"}
                        </span>
                      </div>
                      <pre>{entry.body}</pre>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </GlassPanel>
      ) : (
        <button
          type="button"
          className="editor-pm-test-chip editor-glass editor-panel-shadow"
          title="Open Post Message receive tester"
          onClick={togglePanel}
        >
          <MessagesSquare className="h-3.5 w-3.5" />
          <span>Post Message test</span>
          <ChevronDown className="h-3 w-3 rotate-180" />
        </button>
      )}
    </div>
  );
}
