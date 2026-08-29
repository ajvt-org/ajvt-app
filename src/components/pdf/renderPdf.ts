"use client";

export async function renderCanvas(node: HTMLElement): Promise<HTMLCanvasElement> {
  const { default: html2canvas } = await import("html2canvas-pro");
  return html2canvas(node, { backgroundColor: null, scale: 2 });
}

export function canvasBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function savePng(node: HTMLElement, filename: string) {
  const blob = await canvasBlob(await renderCanvas(node));
  if (blob) downloadBlob(blob, filename);
}

export async function savePdf(node: HTMLElement, filename: string) {
  const [canvas, { jsPDF }] = await Promise.all([renderCanvas(node), import("jspdf")]);
  const pdf = new jsPDF({
    orientation: canvas.width >= canvas.height ? "landscape" : "portrait",
    unit: "px",
    format: [canvas.width, canvas.height],
  });
  pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, canvas.width, canvas.height);
  pdf.save(filename);
}

export async function sharePng(
  node: HTMLElement,
  filename: string,
  title: string,
  fallbackUrl?: string,
) {
  const blob = await canvasBlob(await renderCanvas(node));
  if (!blob) return;

  const file = new File([blob], filename, { type: "image/png" });
  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title });
    return;
  }
  if (navigator.share && fallbackUrl) {
    await navigator.share({ title, url: fallbackUrl });
    return;
  }
  downloadBlob(blob, filename);
}
