import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hasQuranFoundationCredentials, quranFoundationEnvironment } from "@/lib/quran-api";

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
    quranFoundationConfigured: hasQuranFoundationCredentials(),
    quranFoundationEnvironment: quranFoundationEnvironment(),
    ready: database && pages === 20 && occurrences > 0
  });
}
