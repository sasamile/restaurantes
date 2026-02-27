"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import pdfParse from "pdf-parse";
import mammoth from "mammoth";

/**
 * Obtiene el contenido de texto de un archivo en storage.
 * Soporta: txt, md, csv, json, pdf, docx
 */
export const fetchFileContent = internalAction({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args): Promise<string> => {
    const url = await ctx.storage.getUrl(args.storageId);
    if (!url) return "";

    const res = await fetch(url);
    if (!res.ok) return "";

    const contentType = res.headers.get("content-type") ?? "";
    const buffer = await res.arrayBuffer();
    const uint8 = new Uint8Array(buffer);

    if (
      contentType.includes("text/plain") ||
      contentType.includes("text/markdown") ||
      contentType.includes("text/csv") ||
      contentType.includes("application/json")
    ) {
      return new TextDecoder().decode(uint8);
    }

    if (contentType.includes("application/pdf")) {
      try {
        const data = await pdfParse(Buffer.from(uint8));
        return data.text?.trim() ?? "";
      } catch {
        return "[Error al extraer texto del PDF]";
      }
    }

    if (
      contentType.includes(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ) ||
      contentType.includes("application/msword")
    ) {
      try {
        const result = await mammoth.extractRawText({ arrayBuffer: buffer });
        return result.value?.trim() ?? "";
      } catch {
        return "[Error al extraer texto del documento Word]";
      }
    }

    return "";
  },
});
