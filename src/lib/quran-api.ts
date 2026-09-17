const API =
  process.env.QF_API_BASE_URL ??
  "https://apis.quran.foundation/content/api/v4";

export type QuranWord = {
  id?: number;
  position: number;
  location?: string;
  char_type_name?: string;
  text_uthmani?: string;
  text_imlaei?: string;
  verse_key?: string;
  page_number?: number;
  line_number?: number;
  audio_url?: string | null;
  translation?: { text?: string; language_name?: string };
  transliteration?: { text?: string; language_name?: string };
};

export type QuranVerse = {
  id: number;
  verse_key: string;
  text_uthmani?: string;
  page_number?: number;
  words?: QuranWord[];
};

function quranHeaders() {
  const clientId = process.env.QF_CLIENT_ID;
  const accessToken = process.env.QF_ACCESS_TOKEN;

  if (!clientId || !accessToken) {
    throw new Error(
      "Missing QF_CLIENT_ID or QF_ACCESS_TOKEN. Add Quran Foundation Content API credentials to .env."
    );
  }

  return {
    "x-client-id": clientId,
    "x-auth-token": accessToken
  };
}

export async function getVersesByPage(
  page: number,
  language: "en" | "id" = "en"
): Promise<QuranVerse[]> {
  if (page < 1 || page > 604) throw new Error("Invalid Mushaf page.");

  const url = new URL(`${API}/verses/by_page/${page}`);
  url.searchParams.set("mushaf", "1");
  url.searchParams.set("language", language);
  url.searchParams.set("words", "true");
  url.searchParams.set(
    "word_fields",
    "text_uthmani,text_imlaei,verse_key,page_number,line_number"
  );
  url.searchParams.set("fields", "text_uthmani,page_number");
  url.searchParams.set("per_page", "50");

  const response = await fetch(url, {
    headers: quranHeaders()
  });

  if (!response.ok) {
    throw new Error(
      `Quran Foundation API error ${response.status} for page ${page} (${language})`
    );
  }

  const data = await response.json();
  return data.verses ?? [];
}
