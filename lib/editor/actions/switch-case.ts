import {
  hasFieldTokens,
  interpolatePlainText,
  resolveActionFieldValue,
  unwrapFieldPath,
} from "@/lib/editor/actions/interpolate-fields";
import { formatResolvedFieldValue } from "@/lib/editor/blocks/json-paths";
import type { ActionNode, CompareOp, SwitchActionNode } from "@/lib/editor/types/hotspot-action";
import {
  SWITCH_HANDLE_DEFAULT,
  switchCaseHandleId,
} from "@/lib/editor/types/hotspot-action";

export const COMPARE_OP_LABELS: Record<CompareOp, string> = {
  eq: "=",
  neq: "≠",
  gt: ">",
  gte: "≥",
  lt: "<",
  lte: "≤",
  contains: "contains",
};

const FIELD_PATH_RE = /^[A-Za-z_$][\w.$[\]]*$/;

function parseNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const num = Number(trimmed);
  return Number.isFinite(num) ? num : null;
}

export function compareValues(
  op: CompareOp,
  left: string,
  right: string,
): boolean {
  const leftNum = parseNumber(left);
  const rightNum = parseNumber(right);
  if (leftNum != null && rightNum != null && op !== "contains") {
    switch (op) {
      case "eq":
        return leftNum === rightNum;
      case "neq":
        return leftNum !== rightNum;
      case "gt":
        return leftNum > rightNum;
      case "gte":
        return leftNum >= rightNum;
      case "lt":
        return leftNum < rightNum;
      case "lte":
        return leftNum <= rightNum;
    }
  }

  const ls = left.trim();
  const rs = right.trim();
  switch (op) {
    case "eq":
      return ls === rs;
    case "neq":
      return ls !== rs;
    case "contains":
      return ls.includes(rs);
    case "gt":
    case "gte":
    case "lt":
    case "lte":
      return false;
  }
}

function resolveSubject(template: string): { missing: boolean; text: string } {
  const trimmed = template.trim();
  if (!trimmed) return { missing: true, text: "" };

  const { path, nodeId } = unwrapFieldPath(trimmed);
  const fromField = path
    ? resolveActionFieldValue(path, nodeId)
    : undefined;
  if (fromField !== undefined) {
    const formatted = formatResolvedFieldValue(fromField);
    return { missing: false, text: formatted === "—" ? "" : formatted };
  }

  if (hasFieldTokens(trimmed) || FIELD_PATH_RE.test(path || trimmed)) {
    return { missing: true, text: "" };
  }
  return { missing: false, text: interpolatePlainText(trimmed) };
}

/** Handle id of the first matching case, or Default. */
export function evaluateSwitchHandle(
  data: SwitchActionNode["data"],
): string {
  const subject = resolveSubject(data.subject);
  if (subject.missing) return SWITCH_HANDLE_DEFAULT;

  for (const item of data.cases) {
    const right = interpolatePlainText(item.right);
    if (compareValues(item.operator, subject.text, right)) {
      return switchCaseHandleId(item.id);
    }
  }
  return SWITCH_HANDLE_DEFAULT;
}

export function switchHandleLabel(
  data: SwitchActionNode["data"],
  handle: string,
): string {
  if (handle === SWITCH_HANDLE_DEFAULT) return "Default";
  const index = data.cases.findIndex(
    (item) => switchCaseHandleId(item.id) === handle,
  );
  return index >= 0 ? `Case ${index + 1}` : "Default";
}

export function validateSwitchData(node: ActionNode): string | null {
  if (node.type !== "switch") return null;
  if (!node.data.subject.trim()) return "Select a field to compare";
  return null;
}

export async function runSwitch(
  node: SwitchActionNode,
  runBranch: (handle: string) => Promise<void>,
): Promise<"stop"> {
  const handle = evaluateSwitchHandle(node.data);
  await runBranch(handle);
  return "stop";
}

/** @internal used by the node footer when a sample item is in scope */
export function sampleSwitchHandle(
  node: SwitchActionNode,
): string | null {
  if (!node.data.subject.trim()) return null;
  return evaluateSwitchHandle(node.data);
}
