import "dotenv/config";
import { mkdir } from "node:fs/promises";
import { assertUploadDirOutsidePublic, uploadDirFrom } from "../src/lib/uploadDir";

async function main() {
  assertUploadDirOutsidePublic(process.env);
  const dir = uploadDirFrom(process.env);
  await mkdir(dir, { recursive: true });
  console.log(`Uploads live in ${dir}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
