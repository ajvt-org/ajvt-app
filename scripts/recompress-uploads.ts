import "dotenv/config";
import { readdir, readFile, writeFile, copyFile, rm, rename, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { join, extname, basename } from "path";
import { fileURLToPath } from "url";
import { v4 as uuidv4 } from "uuid";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import sharp from "sharp";
import { pgAdapterOptions } from "../src/lib/db-url";
import { processImage } from "../src/lib/imageProcessing";

// One-shot migration for uploads written before image compression (A2)
// existed: same treatment (resize/WebP/strip EXIF/thumbnail), applied to
// files already sitting on disk. Meant to run once against the Render
// persistent disk — see AGENTS.md task A3. Safe to re-run: already-processed
// files are skipped via the manifest, and a resumed run picks up where a
// crashed one left off.
//
// Usage:
//   tsx scripts/recompress-uploads.ts --dry-run   # report only, touch nothing
//   tsx scripts/recompress-uploads.ts             # actually recompress + update DB

const DRY_RUN = process.argv.includes("--dry-run");
const uploadDirArg = process.argv.find((a) => a.startsWith("--upload-dir="));
const UPLOAD_DIR = uploadDirArg ? uploadDirArg.slice("--upload-dir=".length) : process.env.UPLOAD_DIR || join(process.cwd(), "public", "uploads");

// Kept outside UPLOAD_DIR on purpose: in dev, UPLOAD_DIR is public/uploads,
// served statically by Next — anything placed inside it (backups, the
// manifest) would become a public URL. A sibling directory is never served.
const MIGRATION_DIR = join(UPLOAD_DIR, "..", "uploads-recompress-migration");
const BACKUP_DIR = join(MIGRATION_DIR, "backup");
const MANIFEST_PATH = join(MIGRATION_DIR, "manifest.json");

interface ManifestEntry {
  processedAt: string;
  oldFilename: string;
  newFilename: string;
  beforeBytes: number;
  afterBytes: number;
  thumbBytes: number;
}
type Manifest = Record<string, ManifestEntry>;

async function loadManifest(): Promise<Manifest> {
  if (!existsSync(MANIFEST_PATH)) return {};
  try {
    return JSON.parse(await readFile(MANIFEST_PATH, "utf8"));
  } catch {
    console.warn(`⚠️  Manifest illisible à ${MANIFEST_PATH}, redémarrage à zéro`);
    return {};
  }
}

async function saveManifest(manifest: Manifest) {
  await mkdir(MIGRATION_DIR, { recursive: true });
  await writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
}

// --- Localiser les références en base pour chaque fichier -----------------
// Chaque champ ci-dessous stocke un nom de fichier d'upload (pas une URL).
// Un même fichier n'est jamais référencé par plus d'une ligne (uuid unique
// par upload), donc un index nom -> emplacement suffit.
type FileRef = { model: "member" | "donation" | "activity" | "team" | "expense" | "activityRegistration"; id: string; field: string };

async function buildFileRefIndex(prisma: PrismaClient): Promise<Map<string, FileRef>> {
  const index = new Map<string, FileRef>();
  const add = (filename: string | null, ref: FileRef) => {
    if (filename) index.set(filename, ref);
  };

  const [members, donations, activities, teams, expenses, registrations] = await Promise.all([
    prisma.member.findMany({ select: { id: true, paymentProof: true, photo: true } }),
    prisma.donation.findMany({ select: { id: true, proof: true, donorPhoto: true } }),
    prisma.activity.findMany({ select: { id: true, photo: true } }),
    prisma.team.findMany({ select: { id: true, logo: true } }),
    prisma.expense.findMany({ select: { id: true, proof: true } }),
    prisma.activityRegistration.findMany({ select: { id: true, paymentProof: true } }),
  ]);

  for (const m of members) {
    add(m.paymentProof, { model: "member", id: m.id, field: "paymentProof" });
    add(m.photo, { model: "member", id: m.id, field: "photo" });
  }
  for (const d of donations) {
    add(d.proof, { model: "donation", id: d.id, field: "proof" });
    add(d.donorPhoto, { model: "donation", id: d.id, field: "donorPhoto" });
  }
  for (const a of activities) add(a.photo, { model: "activity", id: a.id, field: "photo" });
  for (const t of teams) add(t.logo, { model: "team", id: t.id, field: "logo" });
  for (const e of expenses) add(e.proof, { model: "expense", id: e.id, field: "proof" });
  for (const r of registrations) add(r.paymentProof, { model: "activityRegistration", id: r.id, field: "paymentProof" });

  return index;
}

async function updateFileRef(prisma: PrismaClient, ref: FileRef, newFilename: string) {
  const data = { [ref.field]: newFilename };
  switch (ref.model) {
    case "member": return prisma.member.update({ where: { id: ref.id }, data });
    case "donation": return prisma.donation.update({ where: { id: ref.id }, data });
    case "activity": return prisma.activity.update({ where: { id: ref.id }, data });
    case "team": return prisma.team.update({ where: { id: ref.id }, data });
    case "expense": return prisma.expense.update({ where: { id: ref.id }, data });
    case "activityRegistration": return prisma.activityRegistration.update({ where: { id: ref.id }, data });
  }
}

// --- Traitement d'un fichier ------------------------------------------------

interface FileResult {
  oldFilename: string;
  newFilename: string;
  beforeBytes: number;
  afterBytes: number;
  thumbBytes: number;
  status: "processed" | "skipped-done" | "error";
  error?: string;
}

export async function processOneFile(oldFilename: string): Promise<FileResult> {
  // Always a fresh id, even if oldFilename is already "<uuid>.webp" — A4
  // relies on uploaded files never being rewritten in place under the same
  // name (immutable caching), so recompressing here must never reuse the
  // old name, only ever replace it.
  const newId = uuidv4();
  const newFilename = `${newId}.webp`;
  const thumbFilename = `${newId}-thumb.webp`;
  const oldPath = join(UPLOAD_DIR, oldFilename);

  const original = await readFile(oldPath);
  const beforeBytes = original.length;

  const { full, thumbnail } = await processImage(original);

  // Cheap sanity check before we touch anything on disk: make sure sharp
  // actually produced a decodable image, not a truncated/corrupt buffer.
  const meta = await sharp(full).metadata();
  if (!meta.width || !meta.height) throw new Error("image de sortie invalide (pas de dimensions)");

  if (!DRY_RUN) {
    await mkdir(BACKUP_DIR, { recursive: true });
    const backupPath = join(BACKUP_DIR, oldFilename);
    if (!existsSync(backupPath)) await copyFile(oldPath, backupPath);

    // Write to temp names first, then rename into place — avoids leaving a
    // half-written file at the final path if the process dies mid-write.
    const tmpFull = join(UPLOAD_DIR, `.${newId}.tmp.webp`);
    const tmpThumb = join(UPLOAD_DIR, `.${newId}.tmp-thumb.webp`);
    await writeFile(tmpFull, full);
    await writeFile(tmpThumb, thumbnail);
    await rename(tmpFull, join(UPLOAD_DIR, newFilename));
    await rename(tmpThumb, join(UPLOAD_DIR, thumbFilename));

    await rm(oldPath, { force: true });
  }

  return {
    oldFilename,
    newFilename,
    beforeBytes,
    afterBytes: full.length,
    thumbBytes: thumbnail.length,
    status: "processed",
  };
}

// --- Orchestration -----------------------------------------------------------

async function main() {
  console.log(`Dossier d'uploads : ${UPLOAD_DIR}`);
  console.log(DRY_RUN ? "Mode --dry-run : aucune écriture, aucune modification en base.\n" : "Mode réel : les fichiers seront recompressés et la base mise à jour.\n");

  if (!existsSync(UPLOAD_DIR)) {
    console.error(`Dossier introuvable : ${UPLOAD_DIR}`);
    process.exit(1);
  }

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("DATABASE_URL is not set");
  const adapter = new PrismaPg(pgAdapterOptions(dbUrl));
  const prisma = new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0]);

  const manifest = await loadManifest();
  const entries = await readdir(UPLOAD_DIR, { withFileTypes: true });
  const candidates = entries
    .filter((e) => e.isFile())
    .map((e) => e.name)
    .filter((name) => !name.startsWith(".") && !name.endsWith("-thumb.webp"));

  console.log(`${candidates.length} fichier(s) à examiner (hors miniatures et fichiers cachés).\n`);

  const fileRefIndex = await buildFileRefIndex(prisma);

  let processed = 0, skipped = 0, errors = 0, orphans = 0, dbUpdates = 0;
  let beforeTotal = 0, afterTotal = 0;
  const log: (FileResult & { dbUpdated: boolean; orphan: boolean })[] = [];

  for (const filename of candidates) {
    const id = basename(filename, extname(filename));
    const already = manifest[id];
    const alreadyThumbName = already ? `${basename(already.newFilename, extname(already.newFilename))}-thumb.webp` : null;
    const outputStillOnDisk = already && alreadyThumbName && existsSync(join(UPLOAD_DIR, already.newFilename)) && existsSync(join(UPLOAD_DIR, alreadyThumbName));
    if (already && outputStillOnDisk) {
      skipped++;
      continue;
    }

    let result: FileResult;
    try {
      result = await processOneFile(filename);
    } catch (err) {
      errors++;
      const message = err instanceof Error ? err.message : String(err);
      console.error(`❌ ${filename} : ${message}`);
      log.push({ oldFilename: filename, newFilename: filename, beforeBytes: 0, afterBytes: 0, thumbBytes: 0, status: "error", error: message, dbUpdated: false, orphan: false });
      continue;
    }

    beforeTotal += result.beforeBytes;
    afterTotal += result.afterBytes + result.thumbBytes;
    processed++;

    const ref = fileRefIndex.get(filename);
    let dbUpdated = false;
    if (ref && result.newFilename !== filename) {
      console.log(`  ${DRY_RUN ? "[dry-run] mettrait à jour" : "mise à jour"} ${ref.model}.${ref.field} (${ref.id}) : ${filename} → ${result.newFilename}`);
      if (!DRY_RUN) {
        await updateFileRef(prisma, ref, result.newFilename);
      }
      dbUpdated = true;
      dbUpdates++;
    } else if (!ref) {
      orphans++;
      console.warn(`  ⚠️  ${filename} : aucune référence trouvée en base (orphelin, cf. tâche D)`);
    }

    if (!DRY_RUN) {
      manifest[id] = {
        processedAt: new Date().toISOString(),
        oldFilename: filename,
        newFilename: result.newFilename,
        beforeBytes: result.beforeBytes,
        afterBytes: result.afterBytes,
        thumbBytes: result.thumbBytes,
      };
      await saveManifest(manifest);
    }

    const pct = result.beforeBytes > 0 ? (100 - ((result.afterBytes + result.thumbBytes) / result.beforeBytes) * 100).toFixed(0) : "0";
    console.log(`✅ ${filename} : ${(result.beforeBytes / 1024).toFixed(0)} Ko → ${(result.afterBytes / 1024).toFixed(0)} Ko + ${(result.thumbBytes / 1024).toFixed(1)} Ko miniature (-${pct}%)`);

    log.push({ ...result, dbUpdated, orphan: !ref });
  }

  if (!DRY_RUN) {
    await mkdir(MIGRATION_DIR, { recursive: true });
    const logPath = join(MIGRATION_DIR, `log-${Date.now()}.json`);
    await writeFile(logPath, JSON.stringify(log, null, 2));
    console.log(`\nJournal détaillé : ${logPath}`);
  }

  console.log("\n--- Résumé ---");
  console.log(`Traités       : ${processed}`);
  console.log(`Déjà à jour   : ${skipped}`);
  console.log(`Erreurs       : ${errors}`);
  console.log(`Orphelins     : ${orphans} (pas de référence en base)`);
  console.log(`MAJ base      : ${dbUpdates}`);
  if (beforeTotal > 0) {
    console.log(`Poids avant   : ${(beforeTotal / 1024 / 1024).toFixed(2)} Mo`);
    console.log(`Poids après   : ${(afterTotal / 1024 / 1024).toFixed(2)} Mo`);
    console.log(`Réduction     : ${(100 - (afterTotal / beforeTotal) * 100).toFixed(1)}%`);
  }
  if (!DRY_RUN) {
    console.log(`\nOriginaux sauvegardés dans : ${BACKUP_DIR}`);
    console.log("À supprimer une fois les images vérifiées sur le site (ils comptent dans l'usage disque tant qu'ils restent là).");
  }

  await prisma.$disconnect();
  if (errors > 0) process.exit(1);
}

// Guard against side effects on import: this file exports processOneFile
// etc. for testing, and importing a module must never touch the database or
// disk on its own — only running it directly (`tsx scripts/recompress-uploads.ts`) should.
const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isDirectRun) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
