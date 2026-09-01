export const DETAIL_SEPARATOR = " · ";

export function personDetails(person: {
  phone: string | null;
  village: string;
  age: string | null;
}): string {
  return [person.phone, person.village, person.age].filter(Boolean).join(DETAIL_SEPARATOR);
}
