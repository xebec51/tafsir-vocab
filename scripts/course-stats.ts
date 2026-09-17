import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const pages = await prisma.page.findMany({
    where: { juzId: 14 },
    orderBy: { unitNumber: "asc" },
    include: {
      occurrences: {
        select: {
          lexemeId: true
        }
      }
    }
  });

  console.table(
    pages.map((page) => ({
      unit: page.unitNumber,
      mushaf: page.mushafPage,
      surah: page.surahLabel ?? "not imported",
      ayat: page.verseRange ?? "—",
      occurrences: page.wordCount,
      coreLexemes: page.coreWordCount,
      uniqueLexemes: new Set(page.occurrences.map((x) => x.lexemeId)).size
    }))
  );

  const [occurrences, lexemes, canonicalLemmas, core, reviewed] =
    await Promise.all([
      prisma.wordOccurrence.count({
        where: { page: { juzId: 14 } }
      }),
      prisma.lexeme.count({
        where: { occurrences: { some: { page: { juzId: 14 } } } }
      }),
      prisma.lexeme.count({
        where: {
          key: { startsWith: "lemma:" },
          occurrences: { some: { page: { juzId: 14 } } }
        }
      }),
      prisma.lexeme.count({
        where: {
          courseStatus: "CORE",
          occurrences: { some: { page: { juzId: 14 } } }
        }
      }),
      prisma.lexeme.count({
        where: {
          reviewStatus: { in: ["REVIEWED", "FINAL"] },
          occurrences: { some: { page: { juzId: 14 } } }
        }
      })
    ]);

  console.log({
    occurrences,
    activeLexemes: lexemes,
    canonicalLemmas,
    core,
    reviewed
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
