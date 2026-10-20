import { QueryClient } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { initialGenerators } from "@/lib/simulator";
import { FakeSocket, createTestClient, wrapper } from "@/test/utils";
import { GENERATORS_KEY, useTelemetryFeed } from "./useTelemetryFeed";

let sockets: FakeSocket[];
let client: QueryClient;
const createSocket = () => {
  const s = new FakeSocket();
  sockets.push(s);
  return s;
};
const last = () => sockets[sockets.length - 1];

function setup(opts: Partial<Parameters<typeof useTelemetryFeed>[0]> = {}) {
  return renderHook(() => useTelemetryFeed({ createSocket, baseDelayMs: 1000, maxAttempts: 2, staleAfterMs: 5000, ...opts }), { wrapper: wrapper(client) });
}

beforeEach(() => {
  vi.useFakeTimers();
  sockets = [];
  client = createTestClient();
});
afterEach(() => vi.useRealTimers());

describe("useTelemetryFeed", () => {
  it("goes live on open and writes valid messages to the cache", () => {
    const { result } = setup();
    expect(result.current.status).toBe("connecting");
    act(() => last().open());
    expect(result.current.status).toBe("live");

    const gens = initialGenerators(5000);
    act(() => last().emit({ type: "snapshot", data: gens }));
    expect(client.getQueryData(GENERATORS_KEY)).toHaveLength(4);

    act(() => last().emit({ type: "telemetry", data: { ...gens[0], loadPct: 12, updatedAt: 6000 } }));
    expect((client.getQueryData(GENERATORS_KEY) as typeof gens)[0].loadPct).toBe(12);
  });

  it("ignores malformed and invalid frames", () => {
    setup();
    act(() => last().open());
    act(() => {
      last().emit("not json");
      last().emit({ type: "telemetry", data: { id: "x" } });
    });
    expect(client.getQueryData(GENERATORS_KEY)).toBeUndefined();
  });

  it("reconnects with exponential backoff and recovers", () => {
    const { result } = setup();
    act(() => last().open());
    act(() => last().drop());
    expect(result.current).toMatchObject({ status: "reconnecting", attempt: 1, retryInSec: 1 });
    expect(sockets).toHaveLength(1);

    act(() => void vi.advanceTimersByTime(1000));
    expect(sockets).toHaveLength(2);
    act(() => last().drop()); // second consecutive failure -> 2s delay
    expect(result.current.attempt).toBe(2);
    act(() => void vi.advanceTimersByTime(1999));
    expect(sockets).toHaveLength(2);
    act(() => void vi.advanceTimersByTime(1));
    expect(sockets).toHaveLength(3);

    act(() => last().open());
    expect(result.current).toMatchObject({ status: "live", attempt: 0 });
  });

  it("goes offline after maxAttempts and can be reconnected manually", () => {
    const { result } = setup();
    for (const wait of [1000, 2000]) {
      act(() => last().drop());
      act(() => void vi.advanceTimersByTime(wait));
    }
    act(() => last().drop());
    expect(result.current.status).toBe("offline");

    act(() => result.current.reconnect());
    expect(result.current.status).toBe("connecting");
    expect(sockets).toHaveLength(4);
    act(() => last().open());
    expect(result.current.status).toBe("live");
  });

  it("flags stale data when an open socket goes silent", () => {
    const { result } = setup();
    act(() => last().open());
    expect(result.current.isStale).toBe(false);
    act(() => void vi.advanceTimersByTime(6000));
    expect(result.current.isStale).toBe(true);
    act(() => last().emit({ type: "snapshot", data: initialGenerators() }));
    expect(result.current.isStale).toBe(false);
  });

  it("closes the socket and stops retrying on unmount", () => {
    const { unmount } = setup();
    const s = last();
    unmount();
    expect(s.closed).toBe(true);
    s.drop();
    act(() => void vi.advanceTimersByTime(20_000));
    expect(sockets).toHaveLength(1);
  });
});
