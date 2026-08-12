// Render's Postgres presents a self-signed cert; sslmode in the connection
// string (require/prefer/verify-ca) gets aliased to verify-full by pg and
// overrides an explicit `ssl` option, so it must be stripped here — the
// `ssl` option returned below is what actually governs TLS. Localhost
// connections (local dev) get no ssl option since local Postgres installs
// don't have TLS configured.
export function pgAdapterOptions(databaseUrl: string) {
  const url = new URL(databaseUrl);
  const isLocal = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  url.searchParams.delete("sslmode");

  return {
    connectionString: url.toString(),
    ssl: isLocal ? undefined : { rejectUnauthorized: false },
  };
}
