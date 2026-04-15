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

    const contentType = (res.headers.get("content-type") ?? "").toLowerCase();
    const buffer = await res.arrayBuffer();
    const uint8 = new Uint8Array(buffer);
    const header = Buffer.from(uint8.slice(0, 8)).toString("utf8");

    const tryDecodeText = (): string => {
      try {
        const decoded = new TextDecoder().decode(uint8).trim();
        if (!decoded) return "";
        // Heurística simple: si parece texto legible, aceptarlo.
        const sample = decoded.slice(0, 1000);
        const controlChars = (sample.match(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g) ?? []).length;
        const ratio = controlChars / Math.max(sample.length, 1);
        return ratio < 0.05 ? decoded : "";
      } catch {
        return "";
      }
    };

    if (
      contentType.includes("text/plain") ||
      contentType.includes("text/markdown") ||
      contentType.includes("text/csv") ||
      contentType.includes("application/json")
    ) {
      return tryDecodeText();
    }

    if (contentType.includes("application/pdf") || header.startsWith("%PDF")) {
      try {
        const data = await pdfParse(Buffer.from(uint8));
        return data.text?.trim() ?? "";
      } catch {
        // Fallback: intentar lectura como texto plano.
        return tryDecodeText() || "[Error al extraer texto del PDF]";
      }
    }

    if (
      contentType.includes(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ) ||
      contentType.includes("application/msword") ||
      header.startsWith("PK")
    ) {
      try {
        const result = await mammoth.extractRawText({ arrayBuffer: buffer });
        const docText = result.value?.trim() ?? "";
        if (docText) return docText;
        return tryDecodeText();
      } catch {
        return tryDecodeText() || "[Error al extraer texto del documento Word]";
      }
    }

    // Último recurso para content-types genéricos (ej: application/octet-stream)
    return tryDecodeText();
  },
});
