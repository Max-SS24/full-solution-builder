import { PDFDocument, StandardFonts, PDFName, PDFString } from "pdf-lib";

export type CardParagraph = { text: string; heading: boolean; url?: string | undefined };

/** Extract only the card, keeping links and reading order without screen captures. */
export function cardParagraphs(card: HTMLElement): CardParagraph[] {
  return Array.from(card.querySelectorAll("h3, h4, p, a")).filter((el) =>
    el.tagName !== "A" || !el.closest("p"),
  ).map((el) => ({
    text: (el.textContent ?? "").trim(),
    heading: el.tagName === "H3" || el.tagName === "H4",
    url: el.tagName === "A" ? el.getAttribute("href") ?? undefined : undefined,
  })).filter((p) => p.text.length > 0);
}

export async function createCareCardPdf(paragraphs: CardParagraph[]): Promise<Blob> {
  const doc = await PDFDocument.create();
  doc.setTitle("VA Navigator · Care card");
  doc.setSubject("Personal care contacts and VA.gov-sourced appointment guidance");
  doc.setLanguage("en-US");
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const width = 540;
  // Standard PDF fonts support Latin text; retain unsupported names visibly rather than failing export.
  const clean = (text: string) => Array.from(text).map((char) => {
    try { regular.encodeText(char); return char; } catch { return "?"; }
  }).join("");
  const layout = (size: number) => paragraphs.map((paragraph) => {
    const font = paragraph.heading ? bold : regular;
    const fontSize = paragraph.heading ? size + 2 : size;
    const lines: string[] = [];
    let line = "";
    for (const word of clean(paragraph.text).split(/\s+/)) {
      if (line && font.widthOfTextAtSize(`${line} ${word}`, fontSize) > width) {
        lines.push(line); line = "";
      }
      for (const char of `${line ? " " : ""}${word}`) {
        if (font.widthOfTextAtSize(line + char, fontSize) > width) {
          lines.push(line.trimEnd()); line = "";
        }
        line += char;
      }
    }
    if (line) lines.push(line);
    return { ...paragraph, font, fontSize, lines, height: lines.length * fontSize * 1.3 + 5 };
  });
  let size = 10;
  let blocks = layout(size);
  while (blocks.reduce((sum, b) => sum + b.height, 0) > 720 && size > 8) {
    size -= 0.25; blocks = layout(size);
  }
  // Preserve legibility if unusually long facility details need a continuation page.
  let page = doc.addPage([612, 792]);
  let y = 756;
  for (const block of blocks) {
    if (y - block.height < 36) { page = doc.addPage([612, 792]); y = 756; }
    const top = y;
    for (const line of block.lines) {
      page.drawText(line, { x: 36, y: y - block.fontSize, size: block.fontSize, font: block.font });
      y -= block.fontSize * 1.3;
    }
    if (block.url && /^https:\/\//.test(block.url)) {
      const annotation = doc.context.register(doc.context.obj({
        Type: "Annot", Subtype: "Link", Rect: [36, y, 576, top], Border: [0, 0, 0],
        A: { Type: "Action", S: "URI", URI: PDFString.of(block.url) },
      }));
      const key = PDFName.of("Annots");
      const existing = page.node.Annots();
      if (existing) existing.push(annotation);
      else page.node.set(key, doc.context.obj([annotation]));
    }
    y -= 5;
  }
  const bytes = await doc.save();
  return new Blob([new Uint8Array(bytes).buffer], { type: "application/pdf" });
}
