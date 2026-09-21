import Dashboard from "@/components/Dashboard";
import { getDashboardData } from "@/lib/dashboard";
import { getLearnerId } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const learnerId = await getLearnerId();
  const data = await getDashboardData(learnerId).catch(() => null);
  return <Dashboard data={data} />;
}
