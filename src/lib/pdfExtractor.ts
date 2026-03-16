import * as pdfjsLib from "pdfjs-dist";

// Use the bundled worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.mjs",
  import.meta.url
).toString();

export interface PdfExtractionProgress {
  currentPage: number;
  totalPages: number;
}

export async function extractTextFromPdf(
  file: File,
  onProgress?: (progress: PdfExtractionProgress) => void
): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
  const totalPages = pdf.numPages;
  const pages: string[] = [];

  for (let i = 1; i <= totalPages; i++) {
    onProgress?.({ currentPage: i, totalPages });
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(" ");
    if (pageText.trim()) pages.push(pageText.trim());
  }

  return pages.join("\n\n");
}
