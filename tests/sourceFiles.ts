import { readdirSync } from "node:fs";
import { join } from "node:path";

// Walking the tree for guard tests that read the source itself.
//
// prisma/migrations holds .sql only, and migrationStamp.test.ts creates and
// removes a folder in it while another worker walks, which made the walk fail
// at random on an entry that had already gone.
const SKIP = new Set(["node_modules", "migrations", ".next", "coverage"]);

export function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return SKIP.has(entry.name) ? [] : sourceFiles(path);
    return /\.tsx?$/.test(entry.name) ? [path] : [];
  });
}
