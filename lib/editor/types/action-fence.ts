export const ACTION_FENCE_TYPE = "actionFence";

export const ACTION_FENCE_COLORS = [
  "#e63946",
  "#f4a259",
  "#06d6a0",
  "#3fb8af",
  "#118ab2",
  "#4361ee",
  "#9b8cff",
  "#ff006e",
] as const;

export type ActionFenceColor = (typeof ACTION_FENCE_COLORS)[number];

export type ActionFence = {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Flow node ids (`h{ownerId}:{nodeId}`) grouped in this fence. */
  memberIds: string[];
};

export type ActionFenceData = {
  name: string;
  color: string;
  scopeKey: string;
};

export function newActionFenceId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `fence-${crypto.randomUUID()}`;
  }
  return `fence-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function cloneActionFence(fence: ActionFence): ActionFence {
  return {
    ...fence,
    memberIds: [...fence.memberIds],
  };
}

export function cloneActionFences(fences: ActionFence[] | undefined): ActionFence[] {
  return (fences ?? []).map(cloneActionFence);
}

export function isActionFenceId(id: string): boolean {
  return id.startsWith("fence-");
}

/** Fences are always scene-wide so hotspot and scene canvases share them. */
export function actionFencesScopeKey(sceneId: string): string {
  return `scene:${sceneId}`;
}
