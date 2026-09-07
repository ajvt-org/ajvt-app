export interface UploadOwner {
  userId: string | null;
  adminId: string | null;
}

function idOf(session: unknown, key: string): string | null {
  if (!session || typeof session !== "object") return null;
  const value = (session as Record<string, unknown>)[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

export function uploadOwnerOf(admin: unknown, user: unknown): UploadOwner {
  return { userId: idOf(user, "userId"), adminId: idOf(admin, "adminId") };
}

export function isAnonymousOwner(owner: UploadOwner): boolean {
  return owner.userId === null && owner.adminId === null;
}

export interface UploadRecord {
  uploadedByUserId: string | null;
  uploadedByAdminId: string | null;
}

export function ownsUpload(record: UploadRecord | null, owner: UploadOwner): boolean {
  if (!record) return false;
  if (owner.userId !== null && record.uploadedByUserId === owner.userId) return true;
  return owner.adminId !== null && record.uploadedByAdminId === owner.adminId;
}
