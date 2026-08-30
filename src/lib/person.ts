export interface Person {
  fullName: string | null;
  age: string | null;
  village: string;
  photo: string | null;
  photoLocked: boolean;
  memberNumber: string | null;
  verifyToken: string | null;
}

export const PERSON_SELECT = {
  fullName: true,
  age: true,
  village: true,
  photo: true,
  photoLocked: true,
  memberNumber: true,
  verifyToken: true,
} as const;

export const PERSON_WITH_PHONE_SELECT = { ...PERSON_SELECT, phone: true } as const;

export const PERSON_NAME_SELECT = { fullName: true } as const;

export function personOf(user: Person) {
  return {
    fullName: user.fullName ?? "",
    age: user.age,
    village: user.village,
    photo: user.photo,
    photoLocked: user.photoLocked,
    memberNumber: user.memberNumber,
    verifyToken: user.verifyToken,
  };
}

export type ShapedPerson = Omit<Person, "fullName"> & { fullName: string };

export function withPerson<M extends { user: Person }>(
  member: M,
): Omit<M, "user"> & ShapedPerson & { user: Omit<M["user"], keyof Person> } {
  const { user, ...membership } = member;
  const { fullName, age, village, photo, photoLocked, memberNumber, verifyToken, ...account } =
    user;
  void fullName;
  void age;
  void village;
  void photo;
  void photoLocked;
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

type WithUser<U> = { id: string; user: U };

export function flatPerson<T extends WithUser<{ fullName: string | null; photo: string | null }>>(
  row: T,
): { id: string; fullName: string; photo: string | null } {
  return { id: row.id, fullName: nameOf(row.user), photo: row.user.photo };
}

export function flatNamed<T extends WithUser<{ fullName: string | null }>>(
  row: T,
): { id: string; fullName: string } {
  return { id: row.id, fullName: nameOf(row.user) };
}

export function flatPlayer<
  T extends WithUser<{
    fullName: string | null;
    photo: string | null;
    phone: string | null;
    age: string | null;
  }>,
>(row: T): { id: string; fullName: string; phone: string; age: string; photo: string | null } {
  return {
    id: row.id,
    fullName: nameOf(row.user),
    phone: row.user.phone ?? "",
    age: row.user.age ?? "",
    photo: row.user.photo,
  };
}

type WithAccount<U> = { userId: string | null; user: U | null };

export function accountPerson<
  T extends WithAccount<{ fullName: string | null; photo: string | null }>,
>(row: T): { id: string; fullName: string; photo: string | null } {
  return {
    id: row.userId ?? "",
    fullName: row.user ? nameOf(row.user) : "",
    photo: row.user?.photo ?? null,
  };
}

export function accountNamed<T extends WithAccount<{ fullName: string | null }>>(
  row: T,
): { id: string; fullName: string } {
  return { id: row.userId ?? "", fullName: row.user ? nameOf(row.user) : "" };
}
