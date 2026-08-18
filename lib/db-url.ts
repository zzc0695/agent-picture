export function getDatabaseUrl(env: Record<string, string | undefined>): string {
  const databaseUrl = env.DATABASE_URL ?? env.STORAGE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  return databaseUrl;
}
