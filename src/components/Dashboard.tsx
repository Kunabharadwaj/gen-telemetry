"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { GENERATORS_KEY, useTelemetryFeed } from "@/hooks/useTelemetryFeed";
import { fetchGenerators, fetchThresholds } from "@/lib/api";
import { mergeGenerators } from "@/lib/generators";
import { createMockFeed, type FeedSocket } from "@/lib/mockSocket";
import type { DashboardParams } from "@/lib/params";
import { DEFAULT_THRESHOLDS, type Generator } from "@/lib/schema";
import { ConnectionBadge } from "./ConnectionBadge";
import { FeedBanner } from "./FeedBanner";
import { GeneratorCard } from "./GeneratorCard";
import { DashboardSkeleton, ErrorState } from "./states";
import { THRESHOLDS_KEY, ThresholdsForm } from "./ThresholdsForm";

interface Props extends Partial<DashboardParams> {
  /** Override the socket factory (tests, or a real `new WebSocket(url)` in production). */
  createSocket?: () => FeedSocket;
}

export function Dashboard({ scenario = "normal", maxAttempts = 5, baseDelayMs = 1000, staleAfterMs = 5000, createSocket }: Props) {
  const mockFeed = useMemo(() => createMockFeed({ scenario }), [scenario]);
  const socketFactory = createSocket ?? mockFeed.connect;

  const feed = useTelemetryFeed({ createSocket: socketFactory, maxAttempts, baseDelayMs, staleAfterMs });

  const generators = useQuery({
    queryKey: GENERATORS_KEY,
    // Merge with anything the websocket delivered while the request was in flight.
    queryFn: async ({ client }): Promise<Generator[]> => mergeGenerators(client.getQueryData<Generator[]>(GENERATORS_KEY), await fetchGenerators()),
  });
  const thresholdsQuery = useQuery({ queryKey: THRESHOLDS_KEY, queryFn: fetchThresholds });
  const thresholds = thresholdsQuery.data ?? DEFAULT_THRESHOLDS;

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-4 sm:p-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">GenWatch</h1>
          <p className="text-sm text-slate-400">Live generator telemetry</p>
        </div>
        <ConnectionBadge status={feed.status} attempt={feed.attempt} maxAttempts={feed.maxAttempts} retryInSec={feed.retryInSec} onReconnect={feed.reconnect} />
      </header>

      <FeedBanner status={feed.status} isStale={feed.isStale} lastMessageAt={feed.lastMessageAt} now={feed.now} />

      {generators.isPending ? (
        <DashboardSkeleton />
      ) : generators.isError ? (
        <ErrorState message={generators.error.message} onRetry={() => generators.refetch()} />
      ) : (
        <section aria-label="Generators" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {generators.data.map((g) => (
            <GeneratorCard key={g.id} generator={g} thresholds={thresholds} now={feed.now} staleAfterMs={staleAfterMs} />
          ))}
        </section>
      )}

      <ThresholdsForm values={thresholds} />
    </main>
  );
}
