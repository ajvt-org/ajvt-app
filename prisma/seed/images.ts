import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

const UPLOAD_DIR = process.env.UPLOAD_DIR || join(process.cwd(), "public", "uploads");
const PALETTE = ["#265c49", "#357a62", "#4a9c7e", "#c47c5a", "#b0643e", "#70b89c"];

const written: string[] = [];

export function placeholder(name: string): string {
  written.push(name);
  return name;
}

export async function writePlaceholders() {
  await mkdir(UPLOAD_DIR, { recursive: true });

  for (let i = 0; i < written.length; i++) {
    const name = written[i];
    const colour = PALETTE[i % PALETTE.length];
    const label = name.replace(/^seed-|\.webp$/g, "");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600">
      <rect width="600" height="600" fill="${colour}"/>
      <text x="300" y="320" font-size="56" fill="#ffffff" text-anchor="middle"
        font-family="sans-serif">${label}</text>
    </svg>`;
    const base = Buffer.from(svg);
    await writeFile(join(UPLOAD_DIR, name), await sharp(base).webp({ quality: 75 }).toBuffer());
    await writeFile(
      join(UPLOAD_DIR, name.replace(/\.webp$/, "-thumb.webp")),
      await sharp(base).resize(300, 300, { fit: "cover" }).webp({ quality: 70 }).toBuffer(),
    );
  }

  console.log(`Placeholder images written: ${written.length * 2} files in ${UPLOAD_DIR}`);
}
