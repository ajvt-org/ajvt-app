export type TokenType = "admin" | "user";

export function isTokenOf(payload: unknown, typ: TokenType): boolean {
  return (
    typeof payload === "object" && payload !== null && (payload as { typ?: unknown }).typ === typ
  );
}
