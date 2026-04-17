import { PDFDocument } from "pdf-lib";

export interface SplitProgress {
  phase: "loading" | "splitting";
  currentPart: number;
  totalParts: number;
}

// Target ~5MB per chunk to stay safely below the 8MB OCR limit on the backend.
const TARGET_CHUNK_BYTES = 5 * 1024 * 1024;
const MAX_CHUNK_BYTES = 7 * 1024 * 1024; // hard ceiling per part

/**
 * Split a PDF into chunks targeting ~5MB each (size-based, page-by-page).
 * Falls through and returns [file] if the original is already small enough.
 */
export async function splitPdf(
  file: File,
  onProgress?: (progress: SplitProgress) => void,
): Promise<File[]> {
  onProgress?.({ phase: "loading", currentPart: 0, totalParts: 0 });

  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const totalPages = pdfDoc.getPageCount();

  if (file.size <= TARGET_CHUNK_BYTES) {
    return [file];
  }

  const baseName = file.name.replace(/\.pdf$/i, "");
  const parts: File[] = [];

  // Rough estimate of total parts for UI progress
  const estimatedParts = Math.max(1, Math.ceil(file.size / TARGET_CHUNK_BYTES));

  let currentDoc = await PDFDocument.create();
  let currentPageCount = 0;
  let currentEstimatedBytes = 0;

  const flush = async () => {
    if (currentPageCount === 0) return;
    onProgress?.({ phase: "splitting", currentPart: parts.length + 1, totalParts: estimatedParts });
    const bytes = await currentDoc.save();
    const blob = new Blob([new Uint8Array(bytes.buffer as ArrayBuffer)], { type: "application/pdf" });
    const partFile = new File([blob], `${baseName}_parte${parts.length + 1}.pdf`, { type: "application/pdf" });

    if (partFile.size > MAX_CHUNK_BYTES && currentPageCount === 1) {
      throw new Error(
        `Uma única página do PDF tem ${(partFile.size / 1024 / 1024).toFixed(1)}MB, acima do limite de OCR. ` +
        `Comprima o PDF (ex.: iLovePDF "Compress PDF") ou divida-o manualmente antes de enviar.`,
      );
    }

    parts.push(partFile);
    currentDoc = await PDFDocument.create();
    currentPageCount = 0;
    currentEstimatedBytes = 0;
  };

  for (let i = 0; i < totalPages; i++) {
    const [copied] = await currentDoc.copyPages(pdfDoc, [i]);
    currentDoc.addPage(copied);
    currentPageCount += 1;

    // Sample current size every few pages to avoid serialising on every iteration
    const sampleNow = currentPageCount % 3 === 0 || i === totalPages - 1;
    if (sampleNow) {
      const sample = await currentDoc.save({ updateFieldAppearances: false });
      currentEstimatedBytes = sample.byteLength;
      if (currentEstimatedBytes >= TARGET_CHUNK_BYTES) {
        await flush();
      }
    }
  }

  if (currentPageCount > 0) {
    await flush();
  }

  return parts;
}
