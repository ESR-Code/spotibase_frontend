import { create } from "zustand";

const MAX_LOGS = 20;
const DEFAULT_PAYLOAD_JSON = "{\n  \n}";

export type PostMessageTestLog = {
  id: string;
  at: number;
  eventName: string;
  ok: boolean;
  body: string;
  error?: string;
};

type PreviewPostMessageTestState = {
  enabledKeys: Set<string>;
  panelOpen: boolean;
  logs: PostMessageTestLog[];
  eventName: string;
  payloadJson: string;
  setNodeEnabled: (ownerId: number, nodeId: string, on: boolean) => void;
  isNodeEnabled: (ownerId: number, nodeId: string) => boolean;
  setPanelOpen: (open: boolean) => void;
  togglePanel: () => void;
  setEventName: (eventName: string) => void;
  setPayloadJson: (payloadJson: string) => void;
  appendLog: (entry: Omit<PostMessageTestLog, "id" | "at">) => void;
  /** Entering Preview: keep opt-in flags, clear the HUD session. */
  beginPreview: () => void;
  /** Leaving Preview: drop opt-in flags, logs, and panel. */
  reset: () => void;
};

export function postMessageTestNodeKey(
  ownerId: number,
  nodeId: string,
): string {
  return `${ownerId}:${nodeId}`;
}

export function parsePostMessageTestNodeKey(
  key: string,
): { ownerId: number; nodeId: string } | null {
  const sep = key.indexOf(":");
  if (sep <= 0) return null;
  const ownerId = Number(key.slice(0, sep));
  const nodeId = key.slice(sep + 1);
  if (!Number.isFinite(ownerId) || !nodeId) return null;
  return { ownerId, nodeId };
}

function newLogId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `pm-test-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export const usePreviewPostMessageTestStore =
  create<PreviewPostMessageTestState>((set, get) => ({
    enabledKeys: new Set<string>(),
    panelOpen: false,
    logs: [],
    eventName: "",
    payloadJson: DEFAULT_PAYLOAD_JSON,
    setNodeEnabled: (ownerId, nodeId, on) => {
      const key = postMessageTestNodeKey(ownerId, nodeId);
      set((state) => {
        const enabledKeys = new Set(state.enabledKeys);
        if (on) enabledKeys.add(key);
        else enabledKeys.delete(key);
        return { enabledKeys };
      });
    },
    isNodeEnabled: (ownerId, nodeId) =>
      get().enabledKeys.has(postMessageTestNodeKey(ownerId, nodeId)),
    setPanelOpen: (panelOpen) => set({ panelOpen }),
    togglePanel: () => set((state) => ({ panelOpen: !state.panelOpen })),
    setEventName: (eventName) => set({ eventName }),
    setPayloadJson: (payloadJson) => set({ payloadJson }),
    appendLog: (entry) => {
      const next: PostMessageTestLog = {
        ...entry,
        id: newLogId(),
        at: Date.now(),
      };
      set((state) => ({
        logs: [next, ...state.logs].slice(0, MAX_LOGS),
      }));
    },
    beginPreview: () =>
      set({
        panelOpen: false,
        logs: [],
        eventName: "",
        payloadJson: DEFAULT_PAYLOAD_JSON,
      }),
    reset: () =>
      set({
        enabledKeys: new Set<string>(),
        panelOpen: false,
        logs: [],
        eventName: "",
        payloadJson: DEFAULT_PAYLOAD_JSON,
      }),
  }));
