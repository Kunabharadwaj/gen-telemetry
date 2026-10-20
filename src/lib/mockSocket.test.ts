import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMockFeed } from "./mockSocket";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

function listen(socket: ReturnType<ReturnType<typeof createMockFeed>["connect"]>) {
  const log = { opened: false, closed: [] as number[], types: [] as string[] };
  socket.onopen = () => (log.opened = true);
  socket.onclose = (e) => log.closed.push(e.code);
  socket.onmessage = (e) => log.types.push(JSON.parse(e.data).type);
  return log;
}

describe("createMockFeed", () => {
  it("opens, sends a snapshot, then telemetry each tick", () => {
    const log = listen(createMockFeed().connect());
    vi.advanceTimersByTime(300);
    expect(log.opened).toBe(true);
    expect(log.types).toEqual(["snapshot"]);
    vi.advanceTimersByTime(1000);
    expect(log.types.filter((t) => t === "telemetry")).toHaveLength(4);
  });

  it("down: errors and closes without ever opening", () => {
    const log = listen(createMockFeed({ scenario: "down" }).connect());
    vi.advanceTimersByTime(300);
    expect(log.opened).toBe(false);
    expect(log.closed).toEqual([1006]);
  });

  it("flaky: drops only the first connection", () => {
    const feed = createMockFeed({ scenario: "flaky" });
    const first = listen(feed.connect());
    vi.advanceTimersByTime(3300);
    expect(first.closed).toEqual([1006]);
    const second = listen(feed.connect());
    vi.advanceTimersByTime(10_000);
    expect(second.closed).toEqual([]);
  });

  it("stall: stays open but stops sending", () => {
    const log = listen(createMockFeed({ scenario: "stall" }).connect());
    vi.advanceTimersByTime(300 + 2000);
    const sent = log.types.length;
    vi.advanceTimersByTime(10_000);
    expect(log.types).toHaveLength(sent);
    expect(log.closed).toEqual([]);
  });

  it("close() stops emission and does not fire onclose", () => {
    const socket = createMockFeed().connect();
    const log = listen(socket);
    vi.advanceTimersByTime(300);
    socket.close();
    const sent = log.types.length;
    vi.advanceTimersByTime(5000);
    expect(log.types).toHaveLength(sent);
    expect(log.closed).toEqual([]);
  });
});
