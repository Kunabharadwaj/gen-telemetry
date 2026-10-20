import type { FeedStatus } from "@/hooks/useTelemetryFeed";

interface Props {
  status: FeedStatus;
  isStale: boolean;
  lastMessageAt: number | null;
  now: number;
}

/** Explains why the numbers on screen may not be current. Renders nothing while data is fresh. */
export function FeedBanner({ status, isStale, lastMessageAt, now }: Props) {
  const lastSeen = lastMessageAt ? new Date(lastMessageAt).toLocaleTimeString() : null;

  if (status === "offline" || status === "reconnecting") {
    return (
      <div role="alert" data-testid="feed-banner" className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
        {status === "offline" ? "Connection lost." : "Connection lost, retrying."} Showing last known values{lastSeen ? ` from ${lastSeen}` : ""}.
      </div>
    );
  }
  if (isStale && lastMessageAt) {
    return (
      <div role="alert" data-testid="feed-banner" className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
        Connected, but no telemetry received for {Math.floor((now - lastMessageAt) / 1000)}s. Values may be out of date.
      </div>
    );
  }
  return null;
}
