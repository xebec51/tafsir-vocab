type QfEnvironment = "prelive" | "production";

type CachedToken = {
  value: string;
  expiresAt: number;
};

let cachedToken: CachedToken | null = null;

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

function environment(): QfEnvironment {
  return process.env.QF_ENV === "production" ? "production" : "prelive";
}

function endpoints() {
  if (environment() === "production") {
    return {
      auth: "https://oauth2.quran.foundation",
      api: "https://apis.quran.foundation/content/api/v4"
    };
  }
  return {
    auth: "https://prelive-oauth2.quran.foundation",
    api: "https://apis-prelive.quran.foundation/content/api/v4"
  };
}

function credentials() {
  const clientId = process.env.QF_CLIENT_ID;
  const clientSecret = process.env.QF_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      "Missing QF_CLIENT_ID or QF_CLIENT_SECRET. Create a Quran Foundation developer app and add server credentials to .env."
    );
  }
  return { clientId, clientSecret };
}

async function getAccessToken(forceRefresh = false) {
  if (!forceRefresh && cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.value;
  }

  const { clientId, clientSecret } = credentials();
  const { auth } = endpoints();
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const response = await fetch(`${auth}/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      scope: "content"
    }),
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Quran Foundation token request failed: ${response.status}`);
  }

  const data = await response.json() as { access_token?: string; expires_in?: number };
  if (!data.access_token) throw new Error("Quran Foundation token response did not include access_token.");

  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000
  };
  return cachedToken.value;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function qfFetch(url: URL, retriedAuth = false, networkAttempt = 0): Promise<Response> {
  const { clientId } = credentials();
  const accessToken = await getAccessToken(retriedAuth);
  const response = await fetch(url, {
    headers: {
      "x-client-id": clientId,
      "x-auth-token": accessToken
    },
    cache: "no-store"
  });

  if (response.status === 401 && !retriedAuth) {
    cachedToken = null;
    return qfFetch(url, true, networkAttempt);
  }

  if ((response.status === 429 || response.status >= 500) && networkAttempt < 2) {
    const retryAfter = Number(response.headers.get("retry-after"));
    const waitMs = Number.isFinite(retryAfter) && retryAfter > 0
      ? retryAfter * 1000
      : 750 * 2 ** networkAttempt;
    await delay(waitMs);
    return qfFetch(url, retriedAuth, networkAttempt + 1);
  }

  return response;
}

export async function getVersesByPage(
  page: number,
  language: "en" | "id" = "en"
): Promise<QuranVerse[]> {
  if (page < 1 || page > 604) throw new Error("Invalid Mushaf page.");

  const { api } = endpoints();
  const url = new URL(`${api}/verses/by_page/${page}`);
  url.searchParams.set("mushaf", "1");
  url.searchParams.set("language", language);
  url.searchParams.set("words", "true");
  url.searchParams.set(
    "word_fields",
    "text_uthmani,text_imlaei,verse_key,location,line_number"
  );
  url.searchParams.set("fields", "text_uthmani,page_number");
  url.searchParams.set("per_page", "50");

  const response = await qfFetch(url);
  if (!response.ok) {
    throw new Error(
      `Quran Foundation API error ${response.status} for page ${page} (${language})`
    );
  }

  const data = await response.json();
  return data.verses ?? [];
}
