/**
 * Scenes entered by consecutive Start-graph Go To Scene hops (App Start /
 * Scene Start). Entering a scene already in the chain is a ping-pong loop
 * (A's Scene Start sends to B, B's sends back to A) and is refused.
 * A user-initiated transition or toggling Preview starts a fresh chain, and
 * so does a pause: a deliberate timed slideshow (Wait, then Go To Scene)
 * hops slower than `CHAIN_WINDOW_MS`.
 */
const CHAIN_WINDOW_MS = 5000;

let chain: string[] = [];
let lastHopAt = 0;

export function resetSceneTransitionChain(): void {
  chain = [];
}

/** Records an automatic hop; returns the loop path when it would repeat a scene. */
export function recordAutomaticSceneHop(
  fromSceneId: string,
  toSceneId: string,
): string[] | null {
  const now = Date.now();
  if (now - lastHopAt > CHAIN_WINDOW_MS) chain = [];
  lastHopAt = now;
  if (chain.length === 0) chain = [fromSceneId];
  if (chain.includes(toSceneId)) return [...chain, toSceneId];
  chain.push(toSceneId);
  return null;
}
