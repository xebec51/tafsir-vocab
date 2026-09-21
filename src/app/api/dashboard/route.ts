import { NextResponse } from "next/server";
import { getDashboardData } from "@/lib/dashboard";
import { getLearnerId } from "@/lib/session";

export async function GET() {
  const learnerId = await getLearnerId();
  return NextResponse.json(await getDashboardData(learnerId));
}
