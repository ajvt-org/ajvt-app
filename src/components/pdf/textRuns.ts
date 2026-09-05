export interface TextRun {
  rtl: boolean;
  text: string;
}

const LTR_RUN = /[0-9A-Za-z][0-9A-Za-z  \t/.,:;+*=%\-–—()[\]]*[0-9A-Za-z]|[0-9A-Za-z]/g;

export function textRuns(text: string): TextRun[] {
  const runs: TextRun[] = [];
  let cut = 0;
  for (const match of text.matchAll(LTR_RUN)) {
    if (match.index > cut) runs.push({ rtl: true, text: text.slice(cut, match.index) });
    runs.push({ rtl: false, text: match[0] });
    cut = match.index + match[0].length;
  }
  if (cut < text.length) runs.push({ rtl: true, text: text.slice(cut) });
  return runs;
}
