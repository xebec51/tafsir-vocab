import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { SENTENCE_MODES } from "../../src/lib/sentence-quiz";
const db = new PrismaClient();
test.afterAll(() => db.$disconnect());

test("page browsing, saved review, refresh, matching and responsive layout", async ({ page }) => {
  await page.goto("/sentences");
  await expect(page.getByRole("heading", { name: "Sentence Translation", exact: true })).toBeVisible();
  await expect(page.locator(".sentence-page-card")).toHaveCount(20);
  for (const width of [1440, 820, 390]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/sentences-library-${width}.png`, fullPage: true });
  }
  await page.goto("/sentences/262");
  await expect(page.getByRole("heading", { name: /Page 262/ })).toBeVisible();
  await expect(page.locator(".sentence-group")).not.toHaveCount(0);
  expect(await page.locator(".sentence-disclosure").first().getAttribute("open")).toBeNull();
  const start = page.locator(".sentence-group").first();
  await start.getByRole("button", { name: "Practice this sentence" }).click();
  await page.waitForURL(/\/sentences\/practice\?session=/, { timeout: 60000 });
  const sessionId = new URL(page.url()).searchParams.get("session")!;
  const session = await db.sentenceQuizSession.findUniqueOrThrow({ where: { id: sessionId } });
  const [question] = session.questionPlan as Array<{ key: string; expected: string; options: string[] }>;
  await page.getByRole("button", { name: question.options.find((option) => option !== question.expected)!, exact: false }).click();
  await expect(page.getByText("Review this sentence", { exact: true })).toBeVisible({ timeout: 30000 });
  await page.reload();
  await expect(page.getByRole("button", { name: question.expected, exact: false })).toBeVisible();
  let dropped = false;
  await page.route(`**/api/sentences/sessions/${sessionId}/attempts`, async (route) => {
    if (!dropped) { dropped = true; await route.fetch(); await route.abort("failed"); }
    else await route.continue();
  });
  await page.getByRole("button", { name: question.expected, exact: false }).click();
  await expect(page.getByRole("button", { name: "Retry saving answer" })).toBeVisible({ timeout: 30000 });
  await page.getByRole("button", { name: "Retry saving answer" }).click();
  await expect(page.getByText("Correct", { exact: true })).toBeVisible({ timeout: 30000 });
  await page.getByRole("button", { name: "Finish", exact: true }).click();
  await expect(page.getByRole("heading", { name: "50% accuracy" })).toBeVisible({ timeout: 30000 });
  await page.reload();
  await expect(page.getByRole("heading", { name: "50% accuracy" })).toBeVisible();
  expect(await db.sentenceQuizAttempt.count({ where: { sessionId } })).toBe(2);
  await page.goto("/sentences/262");
  await page.locator(".sentence-page-actions select").selectOption("MATCH");
  await page.getByRole("button", { name: "Practice this page" }).click();
  await page.waitForURL(/practice\?session=/, { timeout: 60000 });
  await expect(page.locator(".sentence-match-arabic")).toHaveCount(3);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/sentences-matching-mobile.png", fullPage: true });
  const matchingId = new URL(page.url()).searchParams.get("session")!;
  const matching = await db.sentenceQuizSession.findUniqueOrThrow({ where: { id: matchingId } });
  const [pair] = matching.questionPlan as Array<{ arabic: string; expected: string }>;
  await page.locator(".sentence-match-arabic").filter({ hasText: pair.arabic }).click();
  await page.getByRole("button", { name: pair.expected, exact: true }).click();
  await expect(page.getByText("Correct", { exact: true })).toBeVisible({ timeout: 30000 });
});

test("all seven modes save results and account login restores sentence progress", async ({ page }) => {
  test.setTimeout(240000);
  await page.goto("/sentences");
  const segment = await db.sentenceSegment.findFirstOrThrow({ where: { curationStatus: "READY", audioVerified: true, page: { juzId: 14, mushafPage: 262 } }, orderBy: { segmentOrder: "asc" } });
  const email = `sentence-e2e-${randomUUID()}@example.com`;
  const password = `${randomUUID()}aA1!`;
  let lastSession = "";
  try {
    for (const mode of SENTENCE_MODES) {
      const created = await page.request.post("/api/sentences/sessions", { data: { requestId: randomUUID(), scope: "page", segmentId: segment.id, mode } });
      expect(created.ok()).toBe(true);
      lastSession = (await created.json()).id;
      await page.goto(`/sentences/practice?session=${lastSession}`);
      const session = await db.sentenceQuizSession.findUniqueOrThrow({ where: { id: lastSession } });
      const [question] = session.questionPlan as Array<{ expected: string; arabic: string; audioUrl: string | null }>;
      if (mode === "TYPING") {
        await page.getByLabel("Your translation", { exact: true }).fill(question.expected);
        await page.getByRole("button", { name: "Check translation" }).click();
      } else if (mode === "MATCH") {
        await page.locator(".sentence-match-arabic").click();
        await page.getByRole("button", { name: question.expected, exact: true }).click();
      } else {
        if (mode === "LISTENING") {
          await expect(page.locator("audio")).toHaveAttribute("src", question.audioUrl!);
          await expect(page.locator(".sentence-prompt")).toHaveCount(0);
        }
        if (mode === "ENGLISH_TO_ARABIC") await expect(page.locator(".sentence-english-prompt")).not.toBeEmpty();
        await page.locator(".sentence-choice").filter({ hasText: question.expected }).click();
      }
      await expect(page.getByText("Correct", { exact: true })).toBeVisible({ timeout: 30000 });
      await page.getByText("Show word breakdown", { exact: true }).click();
      await expect(page.locator(".sentence-breakdown > div").first()).toBeVisible();
      await page.getByRole("button", { name: "Finish", exact: true }).click();
      await expect(page.getByRole("heading", { name: "100% accuracy" })).toBeVisible({ timeout: 30000 });
    }
    const signup = await page.request.post("/api/auth/signup", { data: { displayName: "Sentence test", email, password } });
    expect(signup.ok()).toBe(true);
    await page.reload();
    await expect(page.getByRole("heading", { name: "100% accuracy" })).toBeVisible();
    expect((await page.request.post("/api/auth/logout")).ok()).toBe(true);
    expect((await page.request.get(`/api/sentences/sessions/${lastSession}`)).status()).toBe(404);
    const login = await page.request.post("/api/auth/login", { data: { email, password } });
    expect(login.ok()).toBe(true);
    const saved = await page.request.get(`/api/sentences/sessions/${lastSession}`);
    expect(saved.ok()).toBe(true);
    expect((await saved.json()).status).toBe("COMPLETED");
    await page.reload();
    await expect(page.getByRole("heading", { name: "100% accuracy" })).toBeVisible();
  } finally {
    await db.user.deleteMany({ where: { email } });
  }
});
