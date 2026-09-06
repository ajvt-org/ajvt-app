export const PERSON_STEP = "person";

export function isPersonStep(step: string | null | undefined): boolean {
  return step === PERSON_STEP;
}

export function stepHref(step: string | null, from: string | null | undefined): string {
  const params = new URLSearchParams();
  if (step) params.set("step", step);
  if (from) params.set("from", from);
  const query = params.toString();
  return query ? `/register?${query}` : "/register";
}
