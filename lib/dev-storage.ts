import fs from "fs";
import path from "path";
import os from "os";

// Stockage local (fichiers temp) utilisé UNIQUEMENT en dev — en prod tout passe
// par R2 (lib/r2/client.ts). Centralise ce qui était copié-collé dans 6 routes
// (deploy/edit/generate/rollback/[id]/upload) : mêmes sous-dossiers temp, même
// convention de préfixe "local:" dans les clés stockées en DB, même
// assainissement de clé ("/" → "_").
export const IS_DEV = process.env.NODE_ENV === "development";

const SOURCE_DIR = "folyyo-source";
const CV_DIR = "folyyo-cvs";

function localFilePath(subdir: string, key: string): string {
  return path.join(os.tmpdir(), subdir, key.replace(/\//g, "_"));
}

function writeLocal(subdir: string, key: string, data: Buffer | string): void {
  const dir = path.join(os.tmpdir(), subdir);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(localFilePath(subdir, key), data);
}

// ── Code source généré (portfolio.json) ────────────────────────────────────
// Écrit en local (dev) ou sur R2 (prod). Retourne la clé de stockage à
// persister en DB (préfixée "local:" en dev pour que readSourceCode sache où
// aller la relire).
export async function writeSourceCode(key: string, code: unknown): Promise<string> {
  if (IS_DEV) {
    writeLocal(SOURCE_DIR, key, JSON.stringify(code));
    return `local:${key}`;
  }
  const { putJson } = await import("@/lib/r2/client");
  await putJson(key, code);
  return key;
}

export async function readSourceCode<T = unknown>(storageKey: string): Promise<T> {
  if (storageKey.startsWith("local:")) {
    const raw = fs.readFileSync(localFilePath(SOURCE_DIR, storageKey.slice(6)), "utf-8");
    return JSON.parse(raw) as T;
  }
  const { getJson } = await import("@/lib/r2/client");
  return getJson<T>(storageKey);
}

// ── CV uploadé (PDF) ────────────────────────────────────────────────────────
export function writeCvLocal(key: string, buffer: Buffer): void {
  writeLocal(CV_DIR, key, buffer);
}

export async function readCvBuffer(storagePath: string): Promise<Buffer | null> {
  if (storagePath.startsWith("local:")) {
    const filePath = localFilePath(CV_DIR, storagePath.slice(6));
    return fs.existsSync(filePath) ? fs.readFileSync(filePath) : null;
  }
  const { getFileBuffer } = await import("@/lib/r2/client");
  return getFileBuffer(storagePath);
}
