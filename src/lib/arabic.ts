const ARABIC_DIACRITICS =
  /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g;

const TATWEEL = /\u0640/g;

const SUPPORT_WORDS = new Set([
  "من", "في", "على", "الى", "عن", "ما", "لا", "لم", "لن", "ان", "اذا", "اذ",
  "ثم", "او", "بل", "هل", "قد", "لو", "لولا", "كل", "مع", "عند", "بين",
  "قبل", "بعد", "حتى", "الا", "لما", "لكن", "لعل", "سوف", "هو", "هي", "هم",
  "هن", "انا", "نحن", "انت", "انتم", "هذا", "هذه", "ذلك", "تلك", "الذي",
  "الذين", "التي", "هؤلاء"
]);

const SUPPORT_GLOSSES = new Set([
  "and", "or", "then", "but", "if", "in", "on", "from", "to", "with", "of",
  "for", "by", "not", "no", "yes", "who", "which", "that", "these", "those",
  "he", "she", "they", "we", "i", "you", "what", "when", "where", "why"
]);

export function normalizeArabic(input: string): string {
  return input
    .replace(ARABIC_DIACRITICS, "")
    .replace(TATWEEL, "")
    .replace(/[ٱأإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/[ۖۗۚۛۜ۞۩]/g, "")
    .replace(/[^\u0621-\u063A\u0641-\u064A]/g, "")
    .trim();
}

export function cleanGloss(input?: string | null): string | null {
  if (!input) return null;

  const cleaned = input
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/\((?:are|is|was|were|to|the|a|an|of|for|in|on|at|from)\)/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned || null;
}

export function courseStatusFor(
  arabic: string,
  english?: string | null
): "CORE" | "SUPPORT" {
  const normalized = normalizeArabic(arabic);

  if (SUPPORT_WORDS.has(normalized)) return "SUPPORT";

  const gloss = cleanGloss(english)?.toLowerCase();
  if (gloss && SUPPORT_GLOSSES.has(gloss)) return "SUPPORT";

  return "CORE";
}
