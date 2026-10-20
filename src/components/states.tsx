export function DashboardSkeleton() {
  return (
    <div data-testid="skeleton" aria-busy="true" aria-label="Loading generators" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="h-72 animate-pulse rounded-xl border border-slate-800 bg-slate-900" />
      ))}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="rounded-xl border border-red-500/40 bg-red-500/10 p-6 text-center">
      <h2 className="mb-1 font-semibold text-red-200">Couldn&apos;t load generators</h2>
      <p className="mb-4 text-sm text-red-300">{message}</p>
      <button type="button" onClick={onRetry} className="rounded-md bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-400">
        Retry
      </button>
    </div>
  );
}
