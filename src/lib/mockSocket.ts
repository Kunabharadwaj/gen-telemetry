import { initialGenerators, stepGenerator } from "./simulator";
import type { Generator } from "./schema";
import type { Scenario } from "./params";

/** The subset of the browser WebSocket API the app relies on, so a real socket is a drop-in. */
export interface FeedSocket {
  onopen: (() => void) | null;
  onmessage: ((ev: { data: string }) => void) | null;
  onclose: ((ev: { code: number }) => void) | null;
  onerror: (() => void) | null;
  close(): void;
}

export interface MockFeedOptions {
  scenario?: Scenario;
  tickMs?: number;
  connectDelayMs?: number;
  /** flaky: the first connection drops this long after opening. */
  dropAfterMs?: number;
  /** stall: the socket stays open but goes silent after this many ticks. */
  stallAfterTicks?: number;
  random?: () => number;
}

/**
 * Simulated generator feed. Simulation state lives in the feed (not the socket) so data
 * continues smoothly across reconnects, like a real backend would.
 */
export function createMockFeed(opts: MockFeedOptions = {}) {
  const { scenario = "normal", tickMs = 1000, connectDelayMs = 300, dropAfterMs = 3000, stallAfterTicks = 2, random = Math.random } = opts;
  let generators: Generator[] = initialGenerators();
  let connections = 0;

  function connect(): FeedSocket {
    const attemptNo = ++connections;
    let closed = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    let interval: ReturnType<typeof setInterval> | undefined;

    const socket: FeedSocket = {
      onopen: null,
      onmessage: null,
      onclose: null,
      onerror: null,
      close() {
        shutdown(1000, false);
      },
    };

    function shutdown(code: number, notify: boolean) {
      if (closed) return;
      closed = true;
      timers.forEach(clearTimeout);
      clearInterval(interval);
      if (notify) socket.onclose?.({ code });
    }
    const send = (msg: unknown) => socket.onmessage?.({ data: JSON.stringify(msg) });

    timers.push(
      setTimeout(() => {
        if (scenario === "down") {
          socket.onerror?.();
          shutdown(1006, true);
          return;
        }
        socket.onopen?.();
        send({ type: "snapshot", data: generators });

        let ticks = 0;
        interval = setInterval(() => {
          if (scenario === "stall" && ++ticks > stallAfterTicks) return;
          generators = generators.map((g) => stepGenerator(g, random));
          generators.forEach((data) => send({ type: "telemetry", data }));
        }, tickMs);

        if (scenario === "flaky" && attemptNo === 1) {
          timers.push(setTimeout(() => shutdown(1006, true), dropAfterMs));
        }
      }, connectDelayMs),
    );
    return socket;
  }

  return { connect };
}
