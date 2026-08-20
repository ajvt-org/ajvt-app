import { readdir, rename, stat, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";

export const PART_SUFFIX = ".part";

export async function writeWhole(dir: string, name: string, data: Buffer): Promise<void> {
  const temp = join(dir, `${name}.${process.pid}${PART_SUFFIX}`);
  await writeFile(temp, data);
  await rename(temp, join(dir, name));
}

export async function completeFiles(dir: string): Promise<Set<string>> {
  const whole = new Set<string>();
  for (const name of await readdir(dir)) {
    if (name.endsWith(PART_SUFFIX)) {
      await unlink(join(dir, name)).catch(() => {});
      continue;
    }
    const size = await stat(join(dir, name))
      .then((info) => info.size)
      .catch(() => 0);
    if (size > 0) whole.add(name);
  }
  return whole;
}
