export interface Person {
  fullName: string | null;
  age: string | null;
  village: string;
  photo: string | null;
  memberNumber: string | null;
  verifyToken: string | null;
}

export const PERSON_SELECT = {
  fullName: true,
  age: true,
  village: true,
  photo: true,
  memberNumber: true,
  verifyToken: true,
} as const;

export const PERSON_NAME_SELECT = { fullName: true } as const;

export function personOf(user: Person) {
  return {
    fullName: user.fullName ?? "",
    age: user.age,
    village: user.village,
    photo: user.photo,
    memberNumber: user.memberNumber,
    verifyToken: user.verifyToken,
  };
}

export type ShapedPerson = Omit<Person, "fullName"> & { fullName: string };

export function withPerson<M extends { user: Person }>(
  member: M,
): Omit<M, "user"> & ShapedPerson & { user: Omit<M["user"], keyof Person> } {
  const { user, ...membership } = member;
  const { fullName, age, village, photo, memberNumber, verifyToken, ...account } = user;
  void fullName;
  void age;
  void village;
  void photo;
  void memberNumber;
  void verifyToken;
  return {
    ...membership,
    ...personOf(user),
    user: account,
  } as Omit<M, "user"> & ShapedPerson & { user: Omit<M["user"], keyof Person> };
}

export function nameOf(user: { fullName: string | null }): string {
  return user.fullName ?? "";
}
