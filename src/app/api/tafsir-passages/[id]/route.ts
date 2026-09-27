import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureLearner } from "@/lib/learner";
import { prisma } from "@/lib/prisma";
import { getLearnerId } from "@/lib/session";
import { documentCategories, hasMeaningfulNoteContent, type TafsirDocument } from "@/lib/tafsir-notes";

const shortText = z.string().max(500);
const longText = z.string().max(12000);
const documentSchema = z.object({
  translation: z.string().max(3000), theme: shortText,
  keywords: z.array(z.object({ arabic: shortText, meaning: shortText })).max(20),
  hasAsbab: z.enum(["unknown", "yes", "no"]), asbabBackground: longText, asbabNarration: longText,
  asbabSource: z.string().max(2000), asbabValidity: shortText,
  asbabRelatedVerses: z.array(z.string().regex(/^\d{1,3}:\d{1,3}$/)).max(30).default([]),
  previousConnection: longText, nextConnection: longText, surahThemeConnection: longText, structureConnection: longText,
  summaryIndonesian: longText, englishExplanation: longText,
  references: z.record(z.string().max(120), z.string().max(5000)), interpretationPoints: longText,
  aqidahLessons: longText, moralLessons: longText, practicalApplication: longText, dawahPoints: longText,
  judgeQuestions: longText, modelAnswers: longText, presentationPhrases: longText, relatedVerses: longText,
  vocabulary: z.array(z.object({ arabicWord: shortText, transliteration: shortText, root: shortText, meaning: shortText, explanation: z.string().max(3000) })).max(60)
});

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const parsed = documentSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "The notes contain invalid or overly long fields." }, { status: 400 });
  const learnerId = await getLearnerId();
  await ensureLearner(learnerId);
  const id = (await params).id;
  const document = parsed.data as TafsirDocument;
  const saved = await prisma.$transaction(async (tx) => {
    const passage = await tx.tafsirPassage.findFirst({ where: { id, learnerId }, select: { id: true } });
    if (!passage) return false;
    await tx.tafsirPassage.update({ where: { id }, data: { theme: document.theme.trim() || null } });
    for (const note of documentCategories(document)) {
      const reference = note.category === "tafsir_references"
        ? Object.entries(document.references).filter(([, value]) => value.trim()).map(([name]) => name).join(", ") || null
        : null;
      if (hasMeaningfulNoteContent(note.content)) {
        await tx.tafsirPassageNote.upsert({ where: { passageId_category: { passageId: id, category: note.category } }, update: { content: note.content, reference }, create: { passageId: id, category: note.category, content: note.content, reference } });
      } else {
        await tx.tafsirPassageNote.deleteMany({ where: { passageId: id, category: note.category } });
      }
    }
    await tx.tafsirPassageVocabulary.deleteMany({ where: { passageId: id } });
    const vocabulary = document.vocabulary.filter((item) => item.arabicWord.trim() || item.meaning.trim());
    if (vocabulary.length) await tx.tafsirPassageVocabulary.createMany({ data: vocabulary.map((item) => ({ passageId: id, arabicWord: item.arabicWord.trim(), transliteration: item.transliteration.trim() || null, root: item.root.trim() || null, meaning: item.meaning.trim(), explanation: item.explanation.trim() || null })) });
    return true;
  });
  return saved ? NextResponse.json({ saved: true }, { headers: { "Cache-Control": "private, no-store" } }) : NextResponse.json({ error: "Passage not found." }, { status: 404 });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const learnerId = await getLearnerId();
  const { count } = await prisma.tafsirPassage.deleteMany({ where: { id: (await params).id, learnerId } });
  return count ? NextResponse.json({ deleted: true }) : NextResponse.json({ error: "Passage not found." }, { status: 404 });
}
