export const DRAFT_KEY = "ajvt_signup_draft";

export interface SignUpDraft {
  phone: string;
  fullName: string;
  village: string;
  age: string;
  photo: string | null;
}

const TEXT_FIELDS = ["phone", "fullName", "village", "age"] as const;

export function readDraft(stored: string | null): Partial<SignUpDraft> {
  let parsed: unknown;
  try {
    parsed = stored ? JSON.parse(stored) : null;
  } catch {
    return {};
  }
  if (!parsed || typeof parsed !== "object") return {};

  const row = parsed as Record<string, unknown>;
  const draft: Partial<SignUpDraft> = {};
  for (const field of TEXT_FIELDS) {
    const value = row[field];
    if (typeof value === "string") draft[field] = value;
  }
  if (typeof row.photo === "string") draft.photo = row.photo;
  return draft;
}
