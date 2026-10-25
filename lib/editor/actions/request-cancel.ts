/**
 * Leaf module (no imports) tracking requests that belong to a running action
 * chain, so leaving Preview or switching scene can abort them in flight.
 */
const runRequests = new Set<AbortController>();

export function trackRunRequest(controller: AbortController): () => void {
  runRequests.add(controller);
  return () => {
    runRequests.delete(controller);
  };
}

export function abortRunRequests(): void {
  const controllers = [...runRequests];
  runRequests.clear();
  for (const controller of controllers) controller.abort();
}
