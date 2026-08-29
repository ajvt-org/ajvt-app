export const LOCAL_DEFAULT_PASSWORD = "admin123";

const LOCAL_HOSTS = ["localhost", "127.0.0.1", "::1", "0.0.0.0", "host.docker.internal"];

export class MissingAdminPasswordError extends Error {
  constructor() {
    super(
      "ADMIN_INITIAL_PASSWORD is not set. Refusing to create the admin account with a known password.",
    );
    this.name = "MissingAdminPasswordError";
  }
}

export interface AdminPasswordEnv {
  ADMIN_INITIAL_PASSWORD?: string;
  DATABASE_URL?: string;
  [key: string]: string | undefined;
}

export function suppliedAdminPassword(env: AdminPasswordEnv): string | null {
  const supplied = env.ADMIN_INITIAL_PASSWORD?.trim();
  return supplied ? supplied : null;
}

export function isLocalDatabase(url: string | undefined): boolean {
  if (!url) return false;
  try {
    return LOCAL_HOSTS.includes(new URL(url).hostname);
  } catch {
    return false;
  }
}

export function initialAdminPassword(env: AdminPasswordEnv): string {
  const supplied = suppliedAdminPassword(env);
  if (supplied) return supplied;
  if (isLocalDatabase(env.DATABASE_URL)) return LOCAL_DEFAULT_PASSWORD;
  throw new MissingAdminPasswordError();
}

export type DefaultPasswordVerdict =
  { action: "keep" } | { action: "warn" } | { action: "replace"; password: string };

export function defaultPasswordVerdict(state: {
  usesDefault: boolean;
  supplied: string | null;
}): DefaultPasswordVerdict {
  if (!state.usesDefault) return { action: "keep" };
  if (!state.supplied) return { action: "warn" };
  return { action: "replace", password: state.supplied };
}
