export function pgAdapterOptions(databaseUrl: string) {
  const url = new URL(databaseUrl);
  const isLocal = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  url.searchParams.delete("sslmode");

  return {
    connectionString: url.toString(),
    ssl: isLocal ? undefined : { rejectUnauthorized: false },
  };
}
