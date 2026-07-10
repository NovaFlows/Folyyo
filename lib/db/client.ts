import { neon } from "@neondatabase/serverless";

const _sql = neon(process.env.DATABASE_URL!);

// Neon cold-start retry — wraps the tagged template literal
async function sqlWithRetry(strings: TemplateStringsArray, ...values: unknown[]) {
  try {
    return await _sql(strings as TemplateStringsArray, ...values);
  } catch (err) {
    const msg = (err as Error).message ?? "";
    if (msg.includes("fetch failed") || msg.includes("connection")) {
      await new Promise((r) => setTimeout(r, 1000));
      return _sql(strings as TemplateStringsArray, ...values);
    }
    throw err;
  }
}

export const sql = sqlWithRetry as unknown as typeof _sql;
