export interface Recorder {
  name: string | null;
  adminId: string | null;
}

export function adminRecorder(admin: { username: string; adminId: string }): Recorder {
  return { name: admin.username, adminId: admin.adminId };
}

export function selfRecorder(name: string): Recorder {
  return { name, adminId: null };
}
