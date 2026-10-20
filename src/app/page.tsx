import { Dashboard } from "@/components/Dashboard";
import { parseDashboardParams } from "@/lib/params";

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = parseDashboardParams(await searchParams);
  return <Dashboard {...params} />;
}
