import { PDFDocument } from "pdf-lib";

export interface SplitProgress {
  phase: "loading" | "splitting";
  currentPart: number;
  totalParts: number;
}

const PAGES_PER_CHUNK = 5;

/**
 * Split a PDF file into smaller chunks of ~30 pages each.
 * Returns an array of File objects ready for upload.
 */
export async function splitPdf(
  file: File,
  onProgress?: (progress: SplitProgress) => void,
  pagesPerChunk = PAGES_PER_CHUNK
): Promise<File[]> {
  onProgress?.({ phase: "loading", currentPart: 0, totalParts: 0 });

  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const totalPages = pdfDoc.getPageCount();

  if (totalPages <= pagesPerChunk) {
    // No need to split
    return [file];
  }

  const totalParts = Math.ceil(totalPages / pagesPerChunk);
  const parts: File[] = [];
  const baseName = file.name.replace(/\.pdf$/i, "");

  for (let i = 0; i < totalParts; i++) {
    onProgress?.({ phase: "splitting", currentPart: i + 1, totalParts });

    const start = i * pagesPerChunk;
    const end = Math.min(start + pagesPerChunk, totalPages);

    const newDoc = await PDFDocument.create();
    const copiedPages = await newDoc.copyPages(
      pdfDoc,
      Array.from({ length: end - start }, (_, idx) => start + idx)
    );
    copiedPages.forEach((page) => newDoc.addPage(page));

    const pdfBytes = await newDoc.save();
    const blob = new Blob([new Uint8Array(pdfBytes.buffer as ArrayBuffer)], { type: "application/pdf" });
    const partFile = new File(
      [blob],
      `${baseName}_parte${i + 1}.pdf`,
      { type: "application/pdf" }
    );
    parts.push(partFile);
  }

  return parts;
}
