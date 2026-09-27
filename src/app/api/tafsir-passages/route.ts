import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureLearner } from "@/lib/learner";
import { prisma } from "@/lib/prisma";
import { getLearnerId } from "@/lib/session";

const requestSchema = z.object({
  title: z.string().trim().min(2).max(180),
  theme: z.string().trim().max(500).optional().default(""),
  surah: z.number().int().min(1).max(114),
  startAyah: z.number().int().min(1).max(300).optional(),
  endAyah: z.number().int().min(1).max(300).optional(),
  selectedAyahs: z.array(z.number().int().min(1).max(300)).max(100).optional().default([])
});

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a title and select valid ayat." }, { status: 400 });
  const input = parsed.data;
  let requestedAyahs = [...new Set(input.selectedAyahs)].sort((a, b) => a - b);
  if (!requestedAyahs.length && input.startAyah !== undefined && input.endAyah !== undefined) {
    const start = Math.min(input.startAyah, input.endAyah);
    const end = Math.max(input.startAyah, input.endAyah);
    requestedAyahs = Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }
  if (!requestedAyahs.length) return NextResponse.json({ error: "Choose an ayah range or one or more specific ayat." }, { status: 400 });

  const occurrences = await prisma.wordOccurrence.findMany({
    where: { surah: input.surah, ayah: { in: requestedAyahs }, page: { juzId: 14 } },
    orderBy: [{ ayah: "asc" }, { wordPosition: "asc" }],
    select: { ayah: true, contextArabic: true, arabic: true }
  });
  const byAyah = new Map<number, { arabicText: string }>();
  for (const occurrence of occurrences) {
    if (!byAyah.has(occurrence.ayah)) byAyah.set(occurrence.ayah, { arabicText: occurrence.contextArabic ?? occurrence.arabic });
  }
  if (byAyah.size !== requestedAyahs.length) return NextResponse.json({ error: "One or more selected ayat are not available in Juz 14." }, { status: 400 });

  const learnerId = await getLearnerId();
  await ensureLearner(learnerId);
  const passage = await prisma.$transaction(async (tx) => {
    const verses = [] as Array<{ id: number; ayahNumber: number }>;
    for (const ayah of requestedAyahs) {
      const item = byAyah.get(ayah)!;
      const verse = await tx.verse.upsert({
        where: { surah_ayahNumber: { surah: input.surah, ayahNumber: ayah } },
        update: { arabicText: item.arabicText },
        create: { surah: input.surah, ayahNumber: ayah, arabicText: item.arabicText }
      });
      verses.push(verse);
    }
    return tx.tafsirPassage.create({
      data: {
        learnerId,
        title: input.title,
        theme: input.theme || null,
        verses: { create: verses.map((verse, position) => ({ verseId: verse.id, position })) }
      },
      select: { id: true }
    });
  });
  return NextResponse.json({ id: passage.id }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
}
