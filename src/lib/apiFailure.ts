import type { ApiError } from "./api";

export function refusalMessage(err: unknown, fallback: string): string {
  if (!(err instanceof Error)) return fallback;
  const status = (err as Partial<ApiError>).status;
  if (typeof status !== "number") return fallback;
  return status >= 400 && status < 500 ? err.message : fallback;
}
