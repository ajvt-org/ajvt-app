export const MEMBER_SORTS = ["review", "az", "za"] as const;

export type MemberSort = (typeof MEMBER_SORTS)[number];

export const DEFAULT_MEMBER_SORT: MemberSort = "review";

export function readMemberSort(value: string | null): MemberSort {
  return MEMBER_SORTS.includes(value as MemberSort) ? (value as MemberSort) : DEFAULT_MEMBER_SORT;
}

const ARABIC = new Intl.Collator("ar");

export function sortMembers<T extends { fullName: string }>(members: T[], sort: MemberSort): T[] {
  if (sort === "review") return members;
  const direction = sort === "za" ? -1 : 1;
  return [...members].sort((a, b) => direction * ARABIC.compare(a.fullName, b.fullName));
}
