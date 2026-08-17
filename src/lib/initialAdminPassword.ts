export const LOCAL_DEFAULT_PASSWORD = "admin123";

export class MissingAdminPasswordError extends Error {
  constructor() {
    super(
      "ADMIN_INITIAL_PASSWORD is not set. Refusing to create the admin account with a known password.",
    );
    this.name = "MissingAdminPasswordError";
  }
}

export function initialAdminPassword(env: {
  ADMIN_INITIAL_PASSWORD?: string;
  NODE_ENV?: string;
}): string {
  const supplied = env.ADMIN_INITIAL_PASSWORD?.trim();
  if (supplied) return supplied;
  if (env.NODE_ENV === "production") throw new MissingAdminPasswordError();
  return LOCAL_DEFAULT_PASSWORD;
}
