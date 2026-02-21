import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined;
};

function getPrismaDatasourceUrl(): string | undefined {
  const rawDatabaseUrl = process.env.DATABASE_URL;
  if (!rawDatabaseUrl) return undefined;

  try {
    const parsed = new URL(rawDatabaseUrl);

    // Supabase pooled connections require pgbouncer mode for Prisma.
    if (parsed.hostname.includes("pooler.supabase.com")) {
      if (!parsed.searchParams.get("pgbouncer")) {
        parsed.searchParams.set("pgbouncer", "true");
      }

      // Keep serverless pool usage conservative.
      if (!parsed.searchParams.get("connection_limit")) {
        parsed.searchParams.set("connection_limit", "1");
      }

      if (!parsed.searchParams.get("sslmode")) {
        parsed.searchParams.set("sslmode", "require");
      }

      return parsed.toString();
    }
  } catch {
    // Fall back to raw URL if parsing fails.
  }

  return rawDatabaseUrl;
}

const datasourceUrl = getPrismaDatasourceUrl();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient(
    datasourceUrl
      ? {
          datasources: {
            db: {
              url: datasourceUrl,
            },
          },
        }
      : undefined
  );

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
