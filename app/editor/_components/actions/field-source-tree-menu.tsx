"use client";

import { ChevronRight } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import {
  buildJsonPathTree,
  type JsonPathTreeNode,
} from "@/lib/editor/blocks/json-paths";
import {
  groupHttpFieldSources,
  type FieldSourceKind,
  type HttpFieldSource,
} from "@/lib/editor/blocks/http-field-sources";

type FieldSourceTreeMenuProps = {
  sources: HttpFieldSource[];
  copiedPath?: string | null;
  onSelect: (source: HttpFieldSource) => void;
  header?: ReactNode;
};

function countLeaves(node: JsonPathTreeNode): number {
  if (node.children.length === 0) return node.sample != null ? 1 : 0;
  return node.children.reduce((sum, child) => sum + countLeaves(child), 0);
}

function FieldTreeNodes({
  nodes,
  depth,
  kind,
  sourceByPath,
  expanded,
  copiedPath,
  onToggle,
  onSelect,
}: {
  nodes: JsonPathTreeNode[];
  depth: number;
  kind: FieldSourceKind;
  sourceByPath: Map<string, HttpFieldSource>;
  expanded: Set<string>;
  copiedPath?: string | null;
  onToggle: (path: string) => void;
  onSelect: (source: HttpFieldSource) => void;
}) {
  return (
    <>
      {nodes.map((node) => {
        const hasChildren = node.children.length > 0;
        const source = sourceByPath.get(node.path);
        const isExpanded = expanded.has(node.path);
        const leafCount = hasChildren ? countLeaves(node) : 0;
        const sampleText =
          copiedPath && source && copiedPath === source.path
            ? "Copied"
            : node.sample;

        return (
          <div key={node.id}>
            <div
              className="editor-field-tree-row"
              data-field-kind={kind}
              data-depth={depth}
              style={{ paddingLeft: 8 + depth * 12 }}
            >
              {hasChildren ? (
                <button
                  type="button"
                  className="editor-field-tree-toggle"
                  aria-expanded={isExpanded}
                  aria-label={isExpanded ? "Collapse" : "Expand"}
                  onMouseDown={(e) => e.preventDefault()}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggle(node.path);
                  }}
                >
                  <ChevronRight
                    className={`h-3 w-3 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                  />
                </button>
              ) : (
                <span className="editor-field-tree-toggle-spacer" />
              )}

              {source ? (
                <button
                  type="button"
                  role="menuitem"
                  className="editor-field-tree-leaf"
                  data-field-kind={kind}
                  title={node.path}
                  onMouseDown={(e) => e.preventDefault()}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(source);
                  }}
                >
                  <span className="editor-field-tree-key">{node.segment}</span>
                  {sampleText ? (
                    <span className="editor-field-tree-sample">{sampleText}</span>
                  ) : null}
                </button>
              ) : (
                <button
                  type="button"
                  className="editor-field-tree-branch"
                  data-field-kind={kind}
                  title={node.path}
                  onMouseDown={(e) => e.preventDefault()}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (hasChildren) onToggle(node.path);
                  }}
                >
                  <span className="editor-field-tree-key">{node.segment}</span>
                  {hasChildren ? (
                    <span className="editor-field-tree-sample">
                      {leafCount} field{leafCount === 1 ? "" : "s"}
                    </span>
                  ) : null}
                </button>
              )}
            </div>

            {hasChildren && isExpanded ? (
              <FieldTreeNodes
                nodes={node.children}
                depth={depth + 1}
                kind={kind}
                sourceByPath={sourceByPath}
                expanded={expanded}
                copiedPath={copiedPath}
                onToggle={onToggle}
                onSelect={onSelect}
              />
            ) : null}
          </div>
        );
      })}
    </>
  );
}

function GroupTree({
  kind,
  items,
  copiedPath,
  onSelect,
}: {
  kind: FieldSourceKind;
  items: HttpFieldSource[];
  copiedPath?: string | null;
  onSelect: (source: HttpFieldSource) => void;
}) {
  const tree = useMemo(
    () =>
      buildJsonPathTree(
        items.map((item) => ({ path: item.path, sample: item.sample })),
      ),
    [items],
  );
  const sourceByPath = useMemo(() => {
    const map = new Map<string, HttpFieldSource>();
    for (const item of items) map.set(item.path, item);
    return map;
  }, [items]);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  const onToggle = (path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  return (
    <FieldTreeNodes
      nodes={tree}
      depth={0}
      kind={kind}
      sourceByPath={sourceByPath}
      expanded={expanded}
      copiedPath={copiedPath}
      onToggle={onToggle}
      onSelect={onSelect}
    />
  );
}

export function FieldSourceTreeMenu({
  sources,
  copiedPath,
  onSelect,
  header,
}: FieldSourceTreeMenuProps) {
  const groups = useMemo(() => groupHttpFieldSources(sources), [sources]);

  return (
    <div
      role="menu"
      className="editor-http-field-menu editor-field-tree-menu nowheel nodrag nopan"
      onWheel={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {header}
      {groups.map((group) => (
        <div key={group.id}>
          <div
            className="editor-http-field-menu-group"
            data-field-kind={group.kind}
          >
            {group.label}
          </div>
          <GroupTree
            kind={group.kind}
            items={group.items}
            copiedPath={copiedPath}
            onSelect={onSelect}
          />
        </div>
      ))}
    </div>
  );
}
