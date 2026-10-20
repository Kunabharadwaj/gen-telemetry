import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import type { FeedSocket } from "@/lib/mockSocket";

export const createTestClient = () => new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });

export function wrapper(client = createTestClient()) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

/** A socket the test drives by hand. */
export class FakeSocket implements FeedSocket {
  onopen: (() => void) | null = null;
  onmessage: ((ev: { data: string }) => void) | null = null;
  onclose: ((ev: { code: number }) => void) | null = null;
  onerror: (() => void) | null = null;
  closed = false;
  close() {
    this.closed = true;
  }
  open() {
    this.onopen?.();
  }
  emit(msg: unknown) {
    this.onmessage?.({ data: typeof msg === "string" ? msg : JSON.stringify(msg) });
  }
  drop() {
    this.onclose?.({ code: 1006 });
  }
}
