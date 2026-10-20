import type { FeedStatus } from "@/hooks/useTelemetryFeed";

interface Props {
  status: FeedStatus;
  attempt: number;
  maxAttempts: number;
  retryInSec: number | null;
  onReconnect: () => void;
}

const STYLES: Record<FeedStatus, string> = {
  connecting: "bg-sky-500/15 text-sky-300 ring-sky-500/40",
  live: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/40",
  reconnecting: "bg-amber-500/15 text-amber-300 ring-amber-500/40",
  offline: "bg-red-500/15 text-red-300 ring-red-500/40",
};

export function ConnectionBadge({ status, attempt, maxAttempts, retryInSec, onReconnect }: Props) {
  const label = {
    connecting: "Connecting…",
    live: "Live",
    reconnecting: `Reconnecting (attempt ${attempt}/${maxAttempts}${retryInSec !== null ? `, retry in ${retryInSec}s` : ""})`,
    offline: "Offline",
  }[status];

  return (
    <div className="flex items-center gap-2">
      <span role="status" data-testid="connection-status" data-status={status} className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ring-1 ${STYLES[status]}`}>
        <span className={`h-2 w-2 rounded-full bg-current ${status === "live" ? "animate-pulse" : ""}`} aria-hidden />
        {label}
      </span>
      {status === "offline" && (
        <button type="button" onClick={onReconnect} className="rounded-md bg-slate-700 px-3 py-1 text-sm hover:bg-slate-600">
          Reconnect
        </button>
      )}
    </div>
  );
}
