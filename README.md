# GenWatch – live generator telemetry dashboard

Next.js (App Router) · TypeScript · Tailwind · TanStack Query · React Hook Form + Zod · mock WebSocket feed.

```bash
npm install
npm run dev                # http://localhost:3000
npm run lint && npm run typecheck && npm test
npx playwright install chromium && npm run e2e
docker build -t gen-telemetry . && docker run -p 3000:3000 gen-telemetry
```

## How it works
- `GET /api/generators` gives the initial snapshot (TanStack Query: loading / error + retry).
- `lib/mockSocket.ts` simulates a WebSocket; `useTelemetryFeed` validates each frame with Zod and merges it into the query cache (newest `updatedAt` wins).
- Reconnect: exponential backoff, gives up after `maxAttempts` (Offline + manual Reconnect button).
- Stale: socket open but silent for `staleAfterMs` → banner; individual cards also go "Stale" when their data ages.
- Alert thresholds form (React Hook Form + Zod resolver) saves via `POST /api/thresholds`.
- To use a real socket, pass `createSocket={() => new WebSocket(url)}` to `<Dashboard>`.

## Failure-mode demos (URL params)
| URL | Shows |
|---|---|
| `/?scenario=flaky` | first connection drops → Reconnecting → Live |
| `/?scenario=stall&staleAfter=2000` | connected but silent → stale banner |
| `/?scenario=down&retries=2&backoff=100` | never connects → Offline + Reconnect button |
