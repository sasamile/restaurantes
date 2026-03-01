import * as pdfjsLib from "pdfjs-dist";

// Worker para pdfjs (requerido en worker mode)
if (typeof window !== "undefined") {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
}

export interface PdfPreviewResult {
  thumbnail: string;
  pageCount: number;
}

/**
 * Genera una imagen base64 de la primera página de un PDF.
 */
export async function generatePdfPreview(file: File): Promise<PdfPreviewResult> {
  if (file.type !== "application/pdf") {
    throw new Error("El archivo no es un PDF");
  }

  const fileUrl = URL.createObjectURL(file);

  try {
    const loadingTask = pdfjsLib.getDocument(fileUrl);
    const pdf = await loadingTask.promise;
    const pageCount = pdf.numPages;

    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 1.5 });

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("No se pudo crear el contexto del canvas");
    }

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({
      canvasContext: context,
      viewport: viewport,
    }).promise;

    const thumbnail = canvas.toDataURL("image/jpeg", 0.8);

    return { thumbnail, pageCount };
  } finally {
    URL.revokeObjectURL(fileUrl);
  }
}
