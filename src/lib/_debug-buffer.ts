/**
 * Buffer de debug en memoria del container Next.js.
 * Persiste mientras el container está vivo. Se pierde en cada deploy.
 */

interface DebugEvent {
  ts: string;
  ns: string;
  data: unknown;
}

const MAX_EVENTS_PER_NS = 50;
const buffer = new Map<string, DebugEvent[]>();

export function record(ns: string, data: unknown): void {
  if (!buffer.has(ns)) buffer.set(ns, []);
  const arr = buffer.get(ns)!;
  arr.push({ ts: new Date().toISOString(), ns, data });
  if (arr.length > MAX_EVENTS_PER_NS) arr.shift();
}

export function dump(ns: string): DebugEvent[] {
  return buffer.get(ns) ?? [];
}

export function clear(ns: string): void {
  buffer.delete(ns);
}

export function listNamespaces(): string[] {
  return Array.from(buffer.keys());
}
