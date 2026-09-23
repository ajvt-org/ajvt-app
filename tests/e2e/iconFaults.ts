import type { Page } from "@playwright/test";
import sharp from "sharp";

export const ICON = 'svg[viewBox="0 0 24 24"][aria-hidden="true"][focusable="false"]';

export function ICON_MARKUP(size: number, style = ""): string {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false" style="${style}"><path d="M12 3l7 3v6c0 4-3 6.5-7 9-4-2.5-7-5-7-9V6l7-3z"/></svg>`;
}

const MIN_CONTRAST = 3;
const SIZE_SLACK = 0.5;
const TALLEST = 6000;

type Rgb = [number, number, number];

interface PlacedIcon {
  where: string;
  declared: number;
  width: number;
  height: number;
  box: { x: number; y: number; width: number; height: number } | null;
  ink: [number, number, number, number];
}

function channel(value: number): number {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance([r, g, b]: Rgb): number {
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrast(a: Rgb, b: Rgb): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

export function over([r, g, b, alpha]: [number, number, number, number], under: Rgb): Rgb {
  return [
    r * alpha + under[0] * (1 - alpha),
    g * alpha + under[1] * (1 - alpha),
    b * alpha + under[2] * (1 - alpha),
  ];
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

async function settle(page: Page) {
  await page.evaluate(() => document.getAnimations().forEach((animation) => animation.finish()));
}

async function placeIcons(page: Page): Promise<PlacedIcon[]> {
  return page.locator(ICON).evaluateAll((icons) => {
    function describe(icon: Element): string {
      const labelled = icon.closest("button, a, label, h1, h2, h3, p, li, td, th, span");
      const text = (labelled?.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 40);
      return text || icon.parentElement?.className?.toString().slice(0, 40) || "unlabelled";
    }

    function colour(value: string): [number, number, number, number] {
      const parts = value.match(/[\d.]+/g)?.map(Number) ?? [0, 0, 0];
      return [parts[0], parts[1], parts[2], parts[3] ?? 1];
    }

    function faded(icon: Element): number {
      let alpha = 1;
      for (let node: Element | null = icon; node; node = node.parentElement) {
        alpha *= Number(getComputedStyle(node).opacity);
      }
      return alpha;
    }

    function unclipped(icon: Element, rect: DOMRect): boolean {
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      for (let node = icon.parentElement; node; node = node.parentElement) {
        const style = getComputedStyle(node);
        if (style.overflowX === "visible" && style.overflowY === "visible") continue;
        const edge = node.getBoundingClientRect();
        if (x < edge.left || x > edge.right || y < edge.top || y > edge.bottom) return false;
      }
      const hit = document.elementFromPoint(x, y);
      return !!hit && (icon.contains(hit) || hit.contains(icon));
    }

    return icons
      .filter((icon) => icon.checkVisibility({ visibilityProperty: true }))
      .map((icon) => {
        const rect = icon.getBoundingClientRect();
        const declared = Number(icon.getAttribute("width"));
        const [r, g, b, a] = colour(getComputedStyle(icon).color);
        return {
          where: describe(icon),
          declared,
          width: rect.width,
          height: rect.height,
          box:
            rect.width > 0 && rect.height > 0 && unclipped(icon, rect)
              ? { x: rect.left, y: rect.top, width: rect.width, height: rect.height }
              : null,
          ink: [r, g, b, a * faded(icon)] as [number, number, number, number],
        };
      });
  });
}

async function backdrop(page: Page) {
  const style = await page.addStyleTag({
    content: `${ICON} { visibility: hidden !important; }`,
  });
  const shot = await page.screenshot({ animations: "disabled" });
  await style.evaluate((node) => (node as Element).remove());
  return sharp(shot).removeAlpha().raw().toBuffer({ resolveWithObject: true });
}

function behind(
  pixels: { data: Buffer; info: { width: number; height: number; channels: number } },
  box: NonNullable<PlacedIcon["box"]>,
): Rgb {
  const { data, info } = pixels;
  const reds: number[] = [];
  const greens: number[] = [];
  const blues: number[] = [];
  const left = Math.max(0, Math.floor(box.x));
  const top = Math.max(0, Math.floor(box.y));
  const right = Math.min(info.width, Math.ceil(box.x + box.width));
  const bottom = Math.min(info.height, Math.ceil(box.y + box.height));
  for (let y = top; y < bottom; y++) {
    for (let x = left; x < right; x++) {
      const at = (y * info.width + x) * info.channels;
      reds.push(data[at]);
      greens.push(data[at + 1]);
      blues.push(data[at + 2]);
    }
  }
  return [median(reds), median(greens), median(blues)];
}

export async function iconFaults(page: Page, label: string): Promise<string[]> {
  const viewport = page.viewportSize() ?? { width: 360, height: 780 };
  const tall = await page.evaluate(() => document.documentElement.scrollHeight);
  await page.setViewportSize({
    width: viewport.width,
    height: Math.min(TALLEST, Math.max(tall, viewport.height)),
  });
  await page.evaluate(() => window.scrollTo(0, 0));
  await settle(page);

  const icons = await placeIcons(page);
  const pixels = await backdrop(page);
  await page.setViewportSize(viewport);

  const faults: string[] = [];
  for (const icon of icons) {
    const smallest = Math.min(icon.width, icon.height);
    if (icon.declared > 0 && smallest < icon.declared - SIZE_SLACK) {
      faults.push(`${label} "${icon.where}" drawn at ${smallest.toFixed(1)}px of ${icon.declared}`);
      continue;
    }
    if (!icon.box) continue;
    const ground = behind(pixels, icon.box);
    const ratio = contrast(over(icon.ink, ground), ground);
    if (ratio < MIN_CONTRAST) {
      faults.push(
        `${label} "${icon.where}" at ${ratio.toFixed(2)} to 1 against rgb(${ground.join(",")})`,
      );
    }
  }
  return faults;
}
