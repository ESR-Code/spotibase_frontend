export type ViewportInvalidation = {
  /** Also recapture the frozen key-light shadow map (casters moved). */
  shadows?: boolean;
};

type ViewportInvalidator = (options?: ViewportInvalidation) => void;

let bound: ViewportInvalidator | null = null;

/** Set by `use-playcanvas-editor` while the engine is alive. */
export function bindViewportInvalidator(invalidate: ViewportInvalidator): () => void {
  bound = invalidate;
  return () => {
    if (bound === invalidate) bound = null;
  };
}

/**
 * Ask the on-demand PlayCanvas loop to draw the next frame. Engine code that
 * changes the scene outside a store update (async textures, drag, clip pose)
 * must call this or the change stays invisible until something else redraws.
 */
export function requestViewportRender(options?: ViewportInvalidation): void {
  bound?.(options);
}
