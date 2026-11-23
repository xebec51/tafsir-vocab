import { spawnSync } from "node:child_process";

// Keep credentials in process memory; a validation branch only replaces the host.
const [task, branchHost] = process.argv.slice(2);
const url = new URL(process.env.DATABASE_URL ?? "");
if (decodeURIComponent(url.pathname.slice(1)) !== "tafsir_vocab") throw new Error("Use the dedicated tafsir_vocab database.");
if (branchHost) {
  if (!/^ep-[a-z0-9-]+\.[a-z0-9.-]+\.neon\.tech$/.test(branchHost)) throw new Error("Invalid Neon branch host.");
  url.hostname = branchHost;
} else {
  url.hostname = url.hostname.replace("-pooler.", ".");
}
const env = { ...process.env, DATABASE_URL: url.toString() };
if (branchHost && task === "test") env.SENTENCE_TEST_DATABASE = "1";
const commands = {
  migrate: ["node_modules/prisma/build/index.js", "migrate", "deploy"],
  import: ["node_modules/tsx/dist/cli.mjs", "scripts/import-sentences.ts"],
  test: ["node_modules/tsx/dist/cli.mjs", "--test", "tests/sentences.integration.test.ts"],
  audit: ["node_modules/tsx/dist/cli.mjs", "scripts/audit-sentences.ts"],
  fixture: ["node_modules/tsx/dist/cli.mjs", "scripts/export-sentence-fixture.ts"],
  dev: ["node_modules/next/dist/bin/next", "dev", "--port", "3100"],
  e2e: ["node_modules/@playwright/test/cli.js", "test"],
  audio: ["node_modules/tsx/dist/cli.mjs", "scripts/verify-sentence-audio.ts"]
};
if (!commands[task]) throw new Error("Choose migrate, import, test, or audit.");
const result = spawnSync(process.execPath, commands[task], { env, stdio: "inherit" });
process.exit(result.status ?? 1);
