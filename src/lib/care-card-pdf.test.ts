import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { cardParagraphs, createCareCardPdf } from "./care-card-pdf";

describe("care card PDF", () => {
  it("exports a readable PDF with linked official sources and facility data", async () => {
    const card = document.createElement("div");
    card.innerHTML = '<h3>VA Navigator · Care card</h3><h4>Your VA facility: Test Clinic</h4><p>123 Test Road</p><p>Phone: <a href="tel:5550100">5550100</a></p><a href="https://www.va.gov/health-care/">https://www.va.gov/health-care/</a>';
    const paragraphs = cardParagraphs(card);
    expect(paragraphs.filter((p) => p.text.includes("5550100"))).toHaveLength(1);
    expect(paragraphs.some((p) => p.text === "123 Test Road")).toBe(true);
    const blob = await createCareCardPdf(paragraphs);
    const bytes = await new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => { if (reader.result instanceof ArrayBuffer) resolve(reader.result); else reject(new Error("PDF could not be read")); };
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(blob);
    });
    expect(blob.type).toBe("application/pdf");
    expect(bytes.byteLength).toBeGreaterThan(500);
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(1);
    expect(doc.getTitle()).toBe("VA Navigator · Care card");
    expect(doc.getPage(0).node.Annots()?.size()).toBe(1);
  });
});