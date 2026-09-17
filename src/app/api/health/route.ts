import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  let database = false;
  let pages = 0;
  let occurrences = 0;
  try {
    [pages, occurrences] = await Promise.all([
      prisma.page.count({ where: { juzId: 14 } }),
      prisma.wordOccurrence.count({ where: { page: { juzId: 14 } } })
    ]);
    database = true;
  } catch {}

  return NextResponse.json({
    database,
    pages,
    occurrences,
    quranFoundationConfigured: Boolean(process.env.QF_CLIENT_ID && process.env.QF_CLIENT_SECRET),
    quranFoundationEnvironment: process.env.QF_ENV === "production" ? "production" : "prelive",
    ready: database && pages === 20 && occurrences > 0
  });
}
