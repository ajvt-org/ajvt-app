import { containsSearch, normalizeSearch } from "@/lib/searchText";
import type { Proof } from "./paymentTypes";

export function matchesSearch(proof: Proof, query: string): boolean {
  const needle = normalizeSearch(query);
  if (!needle) return true;
  return (
    containsSearch(proof.memberName, needle) ||
    containsSearch(proof.activityTitle, needle) ||
    containsSearch(proof.competitionName, needle) ||
    containsSearch(proof.donorName, needle) ||
    containsSearch(proof.bankReference, needle) ||
    containsSearch(proof.receipt?.number, needle)
  );
}
