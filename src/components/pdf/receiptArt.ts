"use client";

import type { jsPDF } from "jspdf";

const markup = new Map<string, string>();

async function svgSource(url: string): Promise<string> {
  const held = markup.get(url);
  if (held) return held;
  const text = await (await fetch(url)).text();
  markup.set(url, text);
  return text;
}

function shapeLabels(pdf: jsPDF, svg: SVGSVGElement) {
  for (const label of Array.from(svg.querySelectorAll("text"))) {
    label.textContent = pdf.processArabic(label.textContent ?? "");
  }
}

export async function drawSvg(
  pdf: jsPDF,
  url: string,
  left: number,
  top: number,
  size: number,
): Promise<void> {
  const [{ svg2pdf }, source] = await Promise.all([import("svg2pdf.js"), svgSource(url)]);
  const parsed = new DOMParser().parseFromString(source, "image/svg+xml");
  const svg = parsed.documentElement as unknown as SVGSVGElement;
  shapeLabels(pdf, svg);

  const stage = document.createElement("div");
  stage.style.cssText = "position:fixed;left:-10000px;top:0";
  stage.appendChild(svg);
  document.body.appendChild(stage);
  try {
    await svg2pdf(svg, pdf, { x: left, y: top, width: size, height: size });
  } finally {
    stage.remove();
  }
}
