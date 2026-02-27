"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex";
import type { Id } from "@/convex";
import { useTenant } from "@/lib/tenant-context";
import { useState, useRef } from "react";

const ACCEPTED_TYPES =
  ".txt,.md,.csv,.json,.pdf,.doc,.docx,text/plain,text/markdown,text/csv,application/json,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword";

export default function KnowledgePage() {
  const { tenantId } = useTenant();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [editingId, setEditingId] = useState<Id<"knowledgeItems"> | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tenant = useQuery(
    api.tenants.get,
    tenantId ? { tenantId } : "skip"
  );
  const items = useQuery(
    api.knowledge.listByTenant,
    tenantId ? { tenantId } : "skip"
  );

  const createItem = useMutation(api.knowledge.create);
  const createFromFile = useMutation(api.knowledge.createFromFile);
  const updateItem = useMutation(api.knowledge.update);
  const removeItem = useMutation(api.knowledge.remove);
  const generateUploadUrl = useMutation(api.knowledge.generateUploadUrl);

  const editingItem = items?.find((i) => i._id === editingId);
  const isFileItem = editingItem?.storageId != null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId) return;
    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();
    if (!trimmedTitle) return;

    if (editingId) {
      await updateItem({
        id: editingId,
        title: trimmedTitle,
        ...(isFileItem ? {} : { content: trimmedContent }),
        tags: tagsInput.trim() ? tagsInput.split(",").map((t) => t.trim()).filter(Boolean) : undefined,
      });
      setEditingId(null);
    } else {
      await createItem({
        tenantId,
        title: trimmedTitle,
        content: trimmedContent,
        tags: tagsInput.trim() ? tagsInput.split(",").map((t) => t.trim()).filter(Boolean) : undefined,
      });
    }
    setTitle("");
    setContent("");
    setTagsInput("");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !tenantId) return;

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    const allowed = ["txt", "md", "csv", "json", "pdf", "doc", "docx"];
    if (!allowed.includes(ext)) {
      alert("Solo se permiten archivos .txt, .md, .csv, .json, .pdf o .doc/.docx");
      return;
    }

    setUploading(true);
    try {
      const url = await generateUploadUrl();
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!res.ok) throw new Error("Error al subir");

      const { storageId } = await res.json();
      await createFromFile({
        tenantId,
        storageId,
        title: file.name.replace(/\.[^.]+$/, "") || file.name,
      });
    } catch (err) {
      console.error(err);
      alert("Error al subir el archivo");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleEdit = (item: {
    _id: Id<"knowledgeItems">;
    title: string;
    content: string;
    storageId?: unknown;
    tags?: string[];
  }) => {
    setEditingId(item._id);
    setTitle(item.title);
    setContent(item.storageId ? "" : item.content);
    setTagsInput(item.tags?.join(", ") ?? "");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setTitle("");
    setContent("");
    setTagsInput("");
  };

  const handleDelete = async (id: Id<"knowledgeItems">) => {
    if (!confirm("¿Eliminar este ítem?")) return;
    await removeItem({ id });
    if (editingId === id) handleCancelEdit();
  };

  if (!tenantId) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-slate-500">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-slate-900">
          Conocimiento — {tenant?.name ?? "Restaurante"}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Base de conocimiento del restaurante. El bot usa esta información para
          responder en WhatsApp. Puedes añadir texto o subir archivos (.txt, .md,
          .csv, .json, .pdf, .doc, .docx).
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr),minmax(0,2fr)]">
        <div className="space-y-4">
          <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900 mb-3">
              {editingId ? "Editar ítem" : "Añadir artículo"}
            </h2>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#197fe6] focus:outline-none focus:ring-1 focus:ring-[#197fe6]"
            />
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={
                isFileItem
                  ? "Para ítems de archivo, el contenido viene del archivo"
                  : "Contenido (menú, horarios, políticas, etc.)"
              }
              disabled={isFileItem}
              rows={4}
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#197fe6] focus:outline-none focus:ring-1 focus:ring-[#197fe6]"
            />
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="Etiquetas (separadas por coma)"
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#197fe6] focus:outline-none focus:ring-1 focus:ring-[#197fe6]"
            />
            <div className="mt-3 flex gap-2">
              <button
                type="submit"
                className="rounded-lg bg-[#197fe6] px-4 py-2 text-sm font-medium text-white hover:bg-[#1565c0] disabled:opacity-50"
                disabled={!title.trim()}
              >
                {editingId ? "Guardar" : "Añadir"}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>

          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-4">
            <h2 className="text-sm font-semibold text-slate-900 mb-2">
              Subir archivo
            </h2>
            <p className="text-xs text-slate-500 mb-3">
              .txt, .md, .csv, .json, .pdf, .doc, .docx — se indexa automáticamente en RAG
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_TYPES}
              onChange={handleFileUpload}
              disabled={uploading}
              className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-[#197fe6] file:px-4 file:py-2 file:text-sm file:font-medium file:text-white file:hover:bg-[#1565c0]"
            />
            {uploading && (
              <p className="mt-2 text-xs text-slate-500">Subiendo e indexando…</p>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-900">Ítems indexados</h2>
          {items?.map((item) => (
            <div
              key={item._id}
              className="rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm"
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <h3 className="font-semibold text-slate-900">{item.title}</h3>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => handleEdit(item)}
                    className="rounded px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(item._id)}
                    className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
              {item.storageId && (
                <span className="inline-block rounded bg-emerald-100 px-2 py-0.5 text-[10px] text-emerald-700">
                  Archivo
                </span>
              )}
              {item.tags && item.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {item.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
              <p className="mt-2 text-xs text-slate-600 line-clamp-3">
                {item.content || "(contenido desde archivo)"}
              </p>
              <span className="mt-2 block text-[10px] text-slate-400">
                Actualizado {new Date(item.updatedAt).toLocaleDateString("es-ES")}
              </span>
            </div>
          ))}
          {(!items || items.length === 0) && (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
              Aún no hay ítems. Añade artículos o sube archivos.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
