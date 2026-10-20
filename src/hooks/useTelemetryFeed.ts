import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { mergeGenerators } from "@/lib/generators";
import type { FeedSocket } from "@/lib/mockSocket";
import { feedMessageSchema, type Generator } from "@/lib/schema";
import { useNow } from "./useNow";

export const GENERATORS_KEY = ["generators"] as const;

export type FeedStatus = "connecting" | "live" | "reconnecting" | "offline";

interface FeedState {
  status: FeedStatus;
  attempt: number;
  retryAt: number | null;
  lastMessageAt: number | null;
}

export interface UseTelemetryFeedOptions {
  createSocket: () => FeedSocket;
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  staleAfterMs?: number;
}

const INITIAL: FeedState = { status: "connecting", attempt: 0, retryAt: null, lastMessageAt: null };

/**
 * Owns the socket lifecycle: connect, exponential-backoff reconnect, give up after
 * `maxAttempts` (status "offline", manual `reconnect`), and stale detection when the
 * socket is open but silent. Messages are validated and merged into the query cache.
 */
export function useTelemetryFeed({
  createSocket,
  maxAttempts = 5,
  baseDelayMs = 1000,
  maxDelayMs = 10_000,
  staleAfterMs = 5000,
}: UseTelemetryFeedOptions) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<FeedState>(INITIAL);
  const [session, setSession] = useState(0);
  const now = useNow(1000);

  useEffect(() => {
    let disposed = false;
    let attempt = 0;
    let socket: FeedSocket | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const apply = (incoming: Generator[]) =>
      queryClient.setQueryData<Generator[]>(GENERATORS_KEY, (prev) => mergeGenerators(prev, incoming));

    const open = () => {
      const s = createSocket();
      socket = s;
      s.onopen = () => {
        attempt = 0;
        setState({ status: "live", attempt: 0, retryAt: null, lastMessageAt: Date.now() });
      };
      s.onmessage = (ev) => {
        let parsed;
        try {
          parsed = feedMessageSchema.safeParse(JSON.parse(ev.data));
        } catch {
          return; // malformed frame: drop it rather than crash the feed
        }
        if (!parsed.success) return;
        apply(parsed.data.type === "snapshot" ? parsed.data.data : [parsed.data.data]);
        setState((st) => ({ ...st, lastMessageAt: Date.now() }));
      };
      s.onclose = () => {
        if (disposed || socket !== s) return;
        attempt += 1;
        if (attempt > maxAttempts) {
          setState((st) => ({ ...st, status: "offline", attempt, retryAt: null }));
          return;
        }
        const delay = Math.min(baseDelayMs * 2 ** (attempt - 1), maxDelayMs);
        setState((st) => ({ ...st, status: "reconnecting", attempt, retryAt: Date.now() + delay }));
        timer = setTimeout(open, delay);
      };
    };

    open();
    return () => {
      disposed = true;
      clearTimeout(timer);
      socket?.close();
    };
  }, [createSocket, queryClient, maxAttempts, baseDelayMs, maxDelayMs, session]);

  const reconnect = useCallback(() => {
    setState(INITIAL);
    setSession((n) => n + 1);
  }, []);

  const isStale = state.status === "live" && state.lastMessageAt !== null && now - state.lastMessageAt > staleAfterMs;
  const retryInSec = state.retryAt === null ? null : Math.max(0, Math.ceil((state.retryAt - now) / 1000));

  return { status: state.status, attempt: state.attempt, maxAttempts, retryInSec, lastMessageAt: state.lastMessageAt, isStale, now, reconnect };
}
