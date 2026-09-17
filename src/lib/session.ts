import { cookies } from "next/headers";

export const LEARNER_COOKIE = "tv_learner";
export const FALLBACK_LEARNER_ID = "anonymous-fallback";

export async function getLearnerId() {
  const store = await cookies();
  return store.get(LEARNER_COOKIE)?.value ?? FALLBACK_LEARNER_ID;
}
