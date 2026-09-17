import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const juz = await prisma.juz.upsert({
    where: { number: 14 },
    update: { title: "Juz 14 — Al-Hijr & An-Nahl" },
    create: {
      id: 14,
      number: 14,
      title: "Juz 14 — Al-Hijr & An-Nahl"
    }
  });

  for (let unitNumber = 1; unitNumber <= 20; unitNumber++) {
    const mushafPage = 261 + unitNumber;

    await prisma.page.upsert({
      where: {
        juzId_unitNumber: {
          juzId: juz.id,
          unitNumber
        }
      },
      update: {
        mushafPage,
        label: `Page ${unitNumber}`
      },
      create: {
        juzId: juz.id,
        unitNumber,
        mushafPage,
        label: `Page ${unitNumber}`
      }
    });
  }

  await prisma.learner.upsert({
    where: { id: "local-demo" },
    update: {},
    create: {
      id: "local-demo",
      displayName: "Learner"
    }
  });

  console.log("Seeded Juz 14 learning path: 20 units, Mushaf pages 262–281.");
  console.log("Next: npm run data:import:juz14");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
