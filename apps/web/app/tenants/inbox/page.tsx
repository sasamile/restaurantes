"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "@/convex";
import type { Id } from "@/convex";
import { useTenant } from "@/lib/tenant-context";

export default function InboxPage() {
  const router = useRouter();
  const { tenantId } = useTenant();
  const [selectedConversationId, setSelectedConversationId] = useState<
    Id<"conversations"> | null
  >(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const tenant = useQuery(
    api.tenants.get,
    tenantId ? { tenantId } : "skip"
  );
  const ycloud = useQuery(
    api.integrations.getYCloud,
    tenantId ? { tenantId } : "skip"
  );
  const tenantConversations = useQuery(
    api.conversations.listByTenant,
    tenantId ? { tenantId } : "skip"
  );
  const activeMessages = useQuery(
    api.messages.listByConversation,
    selectedConversationId ? { conversationId: selectedConversationId } : "skip"
  );
  const sendMessage = useAction(api.ycloud.sendWhatsAppMessage);

  useEffect(() => {
    if (tenantId && ycloud !== undefined && !ycloud?.connected) {
      router.replace("/tenants/integraciones");
    }
  }, [ycloud, tenantId, router]);

  useEffect(() => {
    if (tenantConversations?.length && !selectedConversationId) {
      setSelectedConversationId(tenantConversations[0]._id);
    }
  }, [tenantConversations, selectedConversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeMessages]);

  const activeConversation = tenantConversations?.find(
    (c) => c._id === selectedConversationId
  );

  const handleSendMessage = async () => {
    const text = replyText.trim();
    if (!text || !tenantId || !selectedConversationId) return;
    setSending(true);
    setSendError(null);
    try {
      await sendMessage({
        tenantId,
        conversationId: selectedConversationId,
        content: text,
      });
      setReplyText("");
    } catch (e) {
      setSendError(e instanceof Error ? e.message : "Error al enviar");
    } finally {
      setSending(false);
    }
  };

  if (!tenantId) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-slate-500">Cargando...</p>
      </div>
    );
  }
  if (ycloud === undefined) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-slate-500">Cargando...</p>
      </div>
    );
  }
  if (!ycloud?.connected) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-slate-500">Redirigiendo a Integraciones...</p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] max-w-6xl mx-auto w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
      {/* Lista de conversaciones - estilo WhatsApp */}
      <div className="flex w-[340px] shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="bg-[#075E54] px-4 py-3">
          <h1 className="text-base font-semibold text-white">
            {tenant?.name ?? "Restaurante"}
          </h1>
          <p className="text-xs text-white/80">
            Conversaciones de WhatsApp
          </p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {tenantConversations?.map((conv) => (
            <button
              key={conv._id}
              type="button"
              onClick={() => setSelectedConversationId(conv._id)}
              className={`flex w-full flex-col items-start gap-0.5 px-4 py-3 text-left transition-colors hover:bg-slate-50 ${
                conv._id === selectedConversationId ? "bg-slate-100" : ""
              }`}
            >
              <div className="flex w-full items-center justify-between">
                <span className="truncate text-sm font-medium text-slate-900">
                  {conv.customerName}
                </span>
                <span className="shrink-0 text-[11px] text-slate-500 pl-2">
                  {new Date(conv.lastMessageAt).toLocaleTimeString("es", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <div className="flex w-full items-center gap-2">
                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-600">
                  {conv.channel}
                </span>
                <span className="truncate text-xs text-slate-500">
                  {conv.externalContactId.replace(/^whatsapp:/, "")}
                </span>
              </div>
            </button>
          ))}
          {(!tenantConversations || tenantConversations.length === 0) && (
            <div className="px-4 py-8 text-center text-sm text-slate-500">
              <p className="font-medium">Sin conversaciones</p>
              <p className="mt-1 text-xs">
                Los mensajes de WhatsApp aparecerán aquí cuando los clientes
                escriban.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Área de chat - estilo WhatsApp */}
      <div className="flex flex-1 flex-col min-w-0 bg-[#ECE5DD]">
        {activeConversation ? (
          <>
            {/* Header del chat */}
            <div className="flex shrink-0 items-center gap-3 border-b border-slate-200 bg-[#F0F2F5] px-4 py-2">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#075E54] text-white font-semibold">
                {activeConversation.customerName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-slate-900">
                  {activeConversation.customerName}
                </p>
                <p className="text-xs text-slate-500">
                  {activeConversation.externalContactId.replace(/^whatsapp:/, "")}
                </p>
              </div>
            </div>

            {/* Mensajes */}
            <div className="flex-1 overflow-y-auto p-4 space-y-1">
              {activeMessages?.map((msg) => (
                <div
                  key={msg._id}
                  className={`flex ${
                    msg.direction === "OUTBOUND" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl px-3 py-2 shadow-sm ${
                      msg.direction === "OUTBOUND"
                        ? "rounded-br-md bg-[#D9FDD3] text-slate-900"
                        : "rounded-bl-md bg-white text-slate-900"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap wrap-break-word">
                      {msg.content}
                    </p>
                    <p
                      className={`mt-1 text-[10px] ${
                        msg.direction === "OUTBOUND"
                          ? "text-slate-500"
                          : "text-slate-400"
                      }`}
                    >
                      {new Date(msg.createdAt).toLocaleTimeString("es", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
              {activeMessages?.length === 0 && (
                <div className="flex h-32 items-center justify-center text-sm text-slate-500">
                  No hay mensajes aún en esta conversación
                </div>
              )}
            </div>

            {/* Input de respuesta */}
            <div className="shrink-0 border-t border-slate-200 bg-[#F0F2F5] p-3">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && !e.shiftKey && handleSendMessage()
                  }
                  placeholder="Escribe un mensaje..."
                  className="flex-1 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#075E54] focus:outline-none focus:ring-2 focus:ring-[#075E54]/20"
                />
                <button
                  type="button"
                  onClick={handleSendMessage}
                  disabled={!replyText.trim() || sending}
                  className="shrink-0 rounded-full bg-[#075E54] p-2.5 text-white transition-colors hover:bg-[#055a52] disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Enviar"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="h-5 w-5"
                  >
                    <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
                  </svg>
                </button>
              </div>
              {sendError && (
                <p className="mt-2 text-xs text-red-600">{sendError}</p>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 bg-[#ECE5DD] text-slate-500">
            <span className="material-symbols-outlined text-4xl">chat</span>
            <p className="text-sm font-medium">Selecciona una conversación</p>
            <p className="text-xs">
              Elige un chat en la lista para ver los mensajes
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
