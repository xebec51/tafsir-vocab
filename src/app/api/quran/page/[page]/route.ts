import { NextResponse } from "next/server";
import { getVersesByPage } from "@/lib/quran-api";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ page: string }> }
) {
  const { page } = await params;
  const mushafPage = Number(page);

  if (!Number.isInteger(mushafPage) || mushafPage < 262 || mushafPage > 281) {
    return NextResponse.json(
      { error: "For the MVP, only Juz 14 pages 262–281 are enabled." },
      { status: 400 }
    );
  }

  try {
    const verses = await getVersesByPage(mushafPage);
    return NextResponse.json({ page: mushafPage, verses });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
