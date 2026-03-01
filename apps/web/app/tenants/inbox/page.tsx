"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useQuery, useAction, useMutation } from "convex/react";
import { api } from "@/convex";
import type { Id } from "@/convex";
import { useTenant } from "@/lib/tenant-context";
import { useAuth } from "@/lib/auth-context";
import {
  Search,
  Paperclip,
  ImageIcon,
  Mic,
  FileIcon,
  Video,
  CornerUpLeftIcon,
  Bot,
  CircleIcon,
  CheckIcon,
  CheckCircle2,
  Send,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ImageViewerModal, type ChatImageItem } from "@/components/inbox/image-viewer-modal";
import { ImagePreviewModal } from "@/components/inbox/image-preview-modal";
import { DocumentPreviewModal } from "@/components/inbox/document-preview-modal";
import { CustomAudioPlayer } from "@/components/inbox/custom-audio-player";
import { IntegrationBlockedBanner } from "@/components/integrations/integration-blocked-banner";
import { cn } from "@/lib/utils";

const DEFAULT_PRIMARY = "#197fe6";
const DEFAULT_SECONDARY = "#06b6d4";
const PRIORITY_LABELS = {
  low: "Baja",
  normal: "Normal",
  high: "Alta",
  urgent: "Urgente",
} as const;
const PRIORITY_COLORS = {
  low: "text-emerald-600",
  normal: "text-amber-500",
  high: "text-orange-500",
  urgent: "text-red-600",
} as const;

type FilterMode = "all" | "bot" | "human" | "urgent";

function formatDateDivider(ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Hoy";
  if (d.toDateString() === yesterday.toDateString()) return "Ayer";
  return d.toLocaleDateString("es-ES", { day: "numeric", month: "long" });
}

export default function InboxPage() {
  const { tenantId } = useTenant();
  const { user } = useAuth();
  const [selectedConversationId, setSelectedConversationId] = useState<
    Id<"conversations"> | null
  >(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState<
    { type: "image" | "audio" | "document"; file: File; preview?: string }[]
  >([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [viewerInitialIndex, setViewerInitialIndex] = useState<number | null>(null);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [selectedDocuments, setSelectedDocuments] = useState<File[]>([]);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    conversationId: Id<"conversations">;
  } | null>(null);
  const [mounted, setMounted] = useState(false);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

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
  const members = useQuery(
    api.users.listByTenant,
    tenantId ? { tenantId } : "skip"
  );
  const needingAttention = useQuery(
    api.conversations.countNeedingAttention,
    tenantId ? { tenantId } : "skip"
  );
  const sendMessage = useAction(api.ycloud.sendWhatsAppMessage);
  const sendMedia = useAction(api.ycloud.sendWhatsAppMedia);
  const generateUploadUrl = useMutation(api.ycloud.generateMediaUploadUrl);
  const updatePriority = useMutation(api.conversations.updatePriority);
  const updateAssignedTo = useMutation(api.conversations.updateAssignedTo);
  const updateStatus = useMutation(api.conversations.updateStatus);

  const primaryColor = tenant?.primaryColor ?? DEFAULT_PRIMARY;
  const secondaryColor = tenant?.secondaryColor ?? DEFAULT_SECONDARY;

  const cssVars = useMemo(
    () =>
      ({
        "--primaryColor": primaryColor,
        "--primarySoft": `color-mix(in srgb, ${primaryColor} 12%, white)`,
        "--primaryLight": `color-mix(in srgb, ${primaryColor} 20%, white)`,
        "--secondaryColor": secondaryColor,
        "--secondarySoft": `color-mix(in srgb, ${secondaryColor} 12%, white)`,
        "--secondaryLight": `color-mix(in srgb, ${secondaryColor} 20%, white)`,
        "--textPrimary": "#0F172A",
        "--textSecondary": "#64748B",
        "--backgroundSoft": "#F8FAFC",
      } as React.CSSProperties),
    [primaryColor, secondaryColor]
  );


  useEffect(() => {
    if (tenantConversations?.length && !selectedConversationId) {
      setSelectedConversationId(tenantConversations[0]._id);
    }
  }, [tenantConversations, selectedConversationId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    if (isMobile && selectedConversationId) setSidebarOpen(false);
  }, [selectedConversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeMessages]);

  useEffect(() => {
    const closeContextMenu = () => setContextMenu(null);
    if (contextMenu) {
      document.addEventListener("click", closeContextMenu);
      return () => document.removeEventListener("click", closeContextMenu);
    }
  }, [contextMenu]);

  const prevNeedingAttentionRef = useRef<number | null>(null);
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    const count = needingAttention ?? 0;
    const prev = prevNeedingAttentionRef.current;
    prevNeedingAttentionRef.current = count;
    if (prev !== null && count > prev && typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "granted") {
        new Notification("Inbox – Necesitan atención", {
          body: `${count} conversación(es) esperan asistencia de un humano`,
          icon: "/icons/ycloud.png",
        });
      }
    }
  }, [needingAttention]);

  const activeConversation = tenantConversations?.find(
    (c) => c._id === selectedConversationId
  );

  // Marcar conversación como vista (para indicador "mensaje nuevo")
  useEffect(() => {
    if (selectedConversationId && activeConversation && typeof window !== "undefined") {
      try {
        localStorage.setItem(
          `inbox-seen-${selectedConversationId}`,
          String(activeConversation.lastMessageAt)
        );
      } catch {
        /* ignore */
      }
    }
  }, [selectedConversationId, activeConversation]);

  const openCount =
    tenantConversations?.filter((c) => c.status === "open").length ?? 0;

  const isBotMode = (c: { assignedTo?: Id<"users"> | null }) =>
    c.assignedTo == null || c.assignedTo === undefined;

  const hasPriority = (p: string | undefined | null): p is "low" | "normal" | "high" | "urgent" =>
    p === "low" || p === "normal" || p === "high" || p === "urgent";

  const filteredConversations = useMemo(() => {
    let list = tenantConversations ?? [];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (c) =>
          c.customerName.toLowerCase().includes(q) ||
          c.externalContactId.toLowerCase().includes(q)
      );
    }
    switch (filterMode) {
      case "bot":
        list = list.filter(isBotMode);
        break;
      case "human":
        list = list.filter((c) => !isBotMode(c));
        break;
      case "urgent":
        list = list.filter((c) => c.priority === "urgent" || c.priority === "high");
        break;
      default:
        break;
    }
    // Ordenar: prioridad (urgent > high > normal > low), luego pendientes (necesitan atención), luego por último mensaje
    const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 } as const;
    return [...list].sort((a, b) => {
      const aP = hasPriority(a.priority) ? priorityOrder[a.priority] : 4;
      const bP = hasPriority(b.priority) ? priorityOrder[b.priority] : 4;
      if (aP !== bP) return aP - bP;
      // Pendientes (status=pending, escalados a humano) arriba
      if (a.status === "pending" && b.status !== "pending") return -1;
      if (a.status !== "pending" && b.status === "pending") return 1;
      return (b.lastMessageAt ?? 0) - (a.lastMessageAt ?? 0);
    });
  }, [tenantConversations, filterMode, searchQuery]);

  const triggerFileInput = (accept: string) => {
    if (!fileInputRef.current) return;
    fileInputRef.current.accept = accept;
    fileInputRef.current.click();
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) setSelectedImages(files);
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) setSelectedDocuments(files);
    if (documentInputRef.current) documentInputRef.current.value = "";
  };

  /** Convierte WebP/GIF/etc a JPEG para compatibilidad con WhatsApp (solo PNG/JPEG). */
  const convertImageToJpeg = (file: File): Promise<File> => {
    const supported = ["image/jpeg", "image/png"];
    if (supported.includes(file.type)) return Promise.resolve(file);
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(img.src);
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("No canvas context"));
          return;
        }
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("No se pudo convertir"));
              return;
            }
            const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
            resolve(new File([blob], name, { type: "image/jpeg" }));
          },
          "image/jpeg",
          0.9
        );
      };
      img.onerror = () => {
        URL.revokeObjectURL(img.src);
        reject(new Error("Error al cargar imagen"));
      };
      img.src = URL.createObjectURL(file);
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length || !tenantId || !selectedConversationId) return;
    const getType = (file: File): "image" | "audio" | "document" => {
      if (file.type.startsWith("image/")) return "image";
      if (file.type.startsWith("audio/")) return "audio";
      return "document";
    };
    const newAttachments: { type: "image" | "audio" | "document"; file: File; preview?: string }[] = [];
    // WhatsApp acepta OGG/MP3; MP4/M4A puede fallar (Convex lo sirve como octet-stream).
    const audioOkTypes = ["audio/ogg", "audio/mpeg", "audio/mp3"];
    for (const file of files) {
      let finalFile = file;
      if (file.type.startsWith("audio/") && !audioOkTypes.some((t) => file.type.startsWith(t) || file.type === t)) {
        setSendError("Audio debe ser OGG o MP3. WebM/M4A pueden fallar con WhatsApp.");
        continue;
      }
      if (file.type.startsWith("image/") && !["image/jpeg", "image/png"].includes(file.type)) {
        try {
          finalFile = await convertImageToJpeg(file);
        } catch {
          setSendError("No se pudo convertir la imagen a JPEG");
          continue;
        }
      }
      newAttachments.push({
        type: getType(finalFile),
        file: finalFile,
        preview: finalFile.type.startsWith("image/") ? URL.createObjectURL(finalFile) : undefined,
      });
    }
    if (newAttachments.length) {
      setPendingAttachments((prev) => {
        const combined = [...prev, ...newAttachments];
        setPreviewIndex(combined.length - 1);
        return combined;
      });
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setPendingAttachments((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (next.length) setPreviewIndex(Math.min(previewIndex, next.length - 1));
      else setPreviewIndex(0);
      prev[index]?.preview && URL.revokeObjectURL(prev[index].preview!);
      return next;
    });
  };

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // WhatsApp/YCloud: OGG primero (Chrome/Firefox); MP4 fallback para Safari.
      const mimeTypes: { mime: string; ext: string }[] = [
        { mime: "audio/ogg; codecs=opus", ext: "ogg" },
        { mime: "audio/mp4", ext: "m4a" },
      ];
      const chosen = mimeTypes.find(({ mime }) => MediaRecorder.isTypeSupported(mime));
      if (!chosen) {
        setSendError("Tu navegador no graba en formato compatible con WhatsApp. Prueba Chrome o Firefox.");
        return;
      }
      const { mime: mimeType, ext } = chosen;
      const recorder = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => e.data.size && audioChunksRef.current.push(e.data);
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (audioChunksRef.current.length) {
          const blob = new Blob(audioChunksRef.current, { type: mimeType });
          const file = new File([blob], `audio.${ext}`, { type: mimeType });
          setPendingAttachments((p) => [...p, { type: "audio", file }]);
        }
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch (err) {
      setSendError("No se pudo acceder al micrófono");
    }
  };

  const handleStopRecording = () => {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    setIsRecording(false);
  };

  const handleSendMessage = async () => {
    const text = replyText.trim();
    const hasAttachments = pendingAttachments.length > 0;
    if ((!text && !hasAttachments) || !tenantId || !selectedConversationId) return;
    setSending(true);
    setSendError(null);
    try {
      const active = tenantConversations?.find((c) => c._id === selectedConversationId);
      const wasBot = active && isBotMode(active);
      const userIdToAssign = (user?._id as Id<"users">) ?? members?.find((m) => m.user)?.user?._id;
      if (wasBot && userIdToAssign) {
        await updateAssignedTo({ conversationId: selectedConversationId, userId: userIdToAssign });
      }
      if (hasAttachments) {
        for (let i = 0; i < pendingAttachments.length; i++) {
          const att = pendingAttachments[i];
          const uploadUrl = await generateUploadUrl();
          const res = await fetch(uploadUrl, {
            method: "POST",
            headers: att.file.type ? { "Content-Type": att.file.type } : undefined,
            body: att.file,
          });
          const { storageId } = (await res.json()) as { storageId: string };
          await sendMedia({
            tenantId,
            conversationId: selectedConversationId,
            storageId: storageId as Id<"_storage">,
            mediaType: att.type,
            caption: i === 0 && text ? text : undefined,
            contentType: att.file.type || undefined,
          });
          if (att.preview) URL.revokeObjectURL(att.preview);
        }
        setPendingAttachments([]);
        setPreviewIndex(0);
      }
      if (text && !hasAttachments) {
        await sendMessage({
          tenantId,
          conversationId: selectedConversationId,
          content: text,
        });
      }
      setReplyText("");
    } catch (e) {
      setSendError(e instanceof Error ? e.message : "Error al enviar");
    } finally {
      setSending(false);
    }
  };

  const getHumanUserId = (): Id<"users"> | null => {
    if (user?._id) return user._id as Id<"users">;
    return (members?.find((m) => m.user)?.user?._id as Id<"users">) ?? null;
  };

  const handleSetMode = async (userId: Id<"users"> | null) => {
    if (!selectedConversationId) return;
    await updateAssignedTo({
      conversationId: selectedConversationId,
      userId,
    });
    // Si cambiamos a Bot, también reabrir la conversación si estaba pendiente (escalada)
    if (userId === null) {
      await updateStatus({ conversationId: selectedConversationId, status: "open" });
    }
  };

  const handleSetPriority = async (
    p: "low" | "normal" | "high" | "urgent" | null
  ) => {
    const targetId = contextMenu?.conversationId ?? selectedConversationId;
    if (!targetId) return;
    await updatePriority({ conversationId: targetId, priority: p });
    setContextMenu(null);
  };

  const handleSetStatus = async (
    status: "open" | "closed" | "pending"
  ) => {
    const targetId = contextMenu?.conversationId ?? selectedConversationId;
    if (!targetId) return;
    await updateStatus({ conversationId: targetId, status });
    setContextMenu(null);
  };

  const handleContextMenuSetMode = async (userId: Id<"users"> | null) => {
    const targetId = contextMenu?.conversationId;
    if (!targetId) return;
    await updateAssignedTo({ conversationId: targetId, userId });
    if (userId === null) {
      await updateStatus({ conversationId: targetId, status: "open" });
    }
    setContextMenu(null);
  };

  const messageGroups = useMemo(() => {
    if (!activeMessages?.length) return [];
    const groups: { date: string; messages: typeof activeMessages }[] = [];
    let currentDate = "";
    let currentMessages: typeof activeMessages = [];
    activeMessages.forEach((msg) => {
      const dateKey = formatDateDivider(msg.createdAt);
      if (dateKey !== currentDate) {
        if (currentMessages.length) groups.push({ date: currentDate, messages: currentMessages });
        currentDate = dateKey;
        currentMessages = [msg];
      } else {
        currentMessages.push(msg);
      }
    });
    if (currentMessages.length) groups.push({ date: currentDate, messages: currentMessages });
    return groups;
  }, [activeMessages]);

  const mediaMessages = useMemo(
    () => activeMessages?.filter((m) => m.mediaUrl) ?? [],
    [activeMessages]
  );

  const chatImages: ChatImageItem[] = useMemo(
    () =>
      (activeMessages ?? [])
        .filter((m) => m.mediaType === "image" && m.mediaUrl)
        .map((m) => ({ url: m.mediaUrl!, text: m.content || "" })),
    [activeMessages]
  );

  const handleSendImages = async (items: { file: File; caption: string }[]) => {
    if (!tenantId || !selectedConversationId || !user) return;
    setSending(true);
    setSendError(null);
    try {
      const active = tenantConversations?.find((c) => c._id === selectedConversationId);
      const wasBot = active && isBotMode(active);
      const userIdToAssign = (user._id as Id<"users">) ?? members?.find((m) => m.user)?.user?._id;
      if (wasBot && userIdToAssign) {
        await updateAssignedTo({ conversationId: selectedConversationId, userId: userIdToAssign });
      }
      for (let i = 0; i < items.length; i++) {
        const { file, caption } = items[i]!;
        const uploadUrl = await generateUploadUrl();
        const res = await fetch(uploadUrl, {
          method: "POST",
          headers: file.type ? { "Content-Type": file.type } : undefined,
          body: file,
        });
        const { storageId } = (await res.json()) as { storageId: string };
        await sendMedia({
          tenantId,
          conversationId: selectedConversationId,
          storageId: storageId as Id<"_storage">,
          mediaType: "image",
          caption: caption || undefined,
          contentType: file.type || undefined,
        });
      }
      setSelectedImages([]);
    } catch (e) {
      setSendError(e instanceof Error ? e.message : "Error al enviar");
    } finally {
      setSending(false);
    }
  };

  const handleSendDocuments = async (items: { file: File; caption: string }[]) => {
    if (!tenantId || !selectedConversationId || !user) return;
    setSending(true);
    setSendError(null);
    try {
      const active = tenantConversations?.find((c) => c._id === selectedConversationId);
      const wasBot = active && isBotMode(active);
      const userIdToAssign = (user._id as Id<"users">) ?? members?.find((m) => m.user)?.user?._id;
      if (wasBot && userIdToAssign) {
        await updateAssignedTo({ conversationId: selectedConversationId, userId: userIdToAssign });
      }
      for (let i = 0; i < items.length; i++) {
        const { file, caption } = items[i]!;
        const uploadUrl = await generateUploadUrl();
        const res = await fetch(uploadUrl, {
          method: "POST",
          headers: file.type ? { "Content-Type": file.type } : undefined,
          body: file,
        });
        const { storageId } = (await res.json()) as { storageId: string };
        await sendMedia({
          tenantId,
          conversationId: selectedConversationId,
          storageId: storageId as Id<"_storage">,
          mediaType: "document",
          caption: caption || undefined,
          contentType: file.type || undefined,
        });
      }
      setSelectedDocuments([]);
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
      <div className="flex h-full min-h-0 w-full flex-col overflow-y-auto p-6">
        <div
          className="mx-auto w-full max-w-2xl"
          style={{ "--primaryColor": primaryColor } as React.CSSProperties}
        >
          <IntegrationBlockedBanner
            message="Necesitas conectar WhatsApp o YCloud para usar el Inbox."
            integrationName="WhatsApp (YCloud)"
            primaryColor={primaryColor}
          />
          <div className="mt-6 rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="text-sm text-slate-500">
              Una vez conectes YCloud en Integraciones, podrás recibir y enviar
              mensajes desde el Inbox.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex h-full min-h-0 w-full overflow-hidden rounded-lg border border-slate-200/80 bg-white shadow-lg"
      style={{ ...cssVars, backgroundColor: "var(--backgroundSoft)" }}
    >
      {/* Sidebar estilo FincasYa - Tabs, búsqueda, Select, lista con border-b y accent */}
      <aside
        className={`
          shrink-0 flex flex-col border-r border-border bg-white min-w-[280px] md:min-w-[340px] transition-all duration-300
          ${sidebarOpen ? "flex w-full md:w-[340px]" : "hidden md:flex md:w-[340px]"}
        `}
      >
        <div className="flex h-full w-full min-w-0 flex-col">
          <div className="shrink-0 p-4 border-b border-border">
            {/* Tabs estilo FincasYa */}
            <div className="mb-3 rounded-lg bg-muted p-[3px] grid grid-cols-4 h-9">
              {(["all", "bot", "human", "urgent"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setFilterMode(mode)}
                  className={`
                    rounded-md text-xs font-medium transition-all flex items-center justify-center
                    ${filterMode === mode
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"}
                  `}
                >
                  {mode === "all" ? "Todas" : mode === "bot" ? "Bot" : mode === "human" ? "Humano" : "Urgentes"}
                </button>
              ))}
            </div>

            {(needingAttention ?? 0) > 0 && (
              <div className="mb-3 rounded-lg bg-amber-100 border border-amber-200 px-3 py-2 flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-600 text-lg">priority_high</span>
                <span className="text-xs font-medium text-amber-800">
                  {needingAttention} conversación(es) necesitan atención humana
                </span>
              </div>
            )}

            {/* Búsqueda estilo FincasYa */}
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar cliente..."
                className="w-full h-9 rounded-md border border-input bg-transparent pl-8 pr-3 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto flex flex-col">
            {filteredConversations.map((conv) => {
              const isActive = conv._id === selectedConversationId;
              const bot = isBotMode(conv);
              return (
                <button
                  key={conv._id}
                  type="button"
                  onClick={() => setSelectedConversationId(conv._id)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setContextMenu({
                      x: e.clientX,
                      y: e.clientY,
                      conversationId: conv._id,
                    });
                  }}
                  className={`
                    relative flex items-start gap-3 border-b border-border/50 p-3 w-full text-left
                    hover:bg-accent/50 transition-colors group
                    ${isActive ? "bg-accent" : ""}
                  `}
                >
                  {/* Barra vertical izquierda estilo FincasYa */}
                  <div
                    className={`
                      absolute left-0 top-1/2 -translate-y-1/2 h-[64%] w-1 rounded-br-full rounded-tr-full
                      transition-all duration-300 origin-center
                      ${isActive ? "scale-y-100 opacity-100" : "scale-y-0 opacity-0"}
                    `}
                    style={{ backgroundColor: "var(--primaryColor)" }}
                  />
                  <div
                    className="size-9 rounded-lg flex items-center justify-center text-white shrink-0 font-semibold text-xs shadow-sm"
                    style={{
                      background: `linear-gradient(135deg, var(--primaryColor), color-mix(in srgb, var(--primaryColor) 75%, #1a1a2e))`,
                    }}
                  >
                    {conv.customerName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex flex-col flex-1 min-w-0 pr-1">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span
                        className={`font-semibold text-[14px] truncate ${isActive ? "text-foreground" : "text-foreground/90"}`}
                      >
                        {conv.customerName}
                      </span>
                      <span className="text-[11px] whitespace-nowrap text-muted-foreground">
                        {new Date(conv.lastMessageAt).toLocaleTimeString("es", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs min-h-[18px]">
                      <div className="flex w-0 grow items-center gap-1 min-w-0 min-h-[18px]">
                        {conv.lastMessageDirection === "OUTBOUND" && (
                          <CornerUpLeftIcon className="size-2.5 shrink-0 text-emerald-600" />
                        )}
                        {conv.lastMessagePreview && (
                          <span className="line-clamp-1 border-r border-border/30 pr-2 truncate" title={conv.lastMessagePreview}>
                            {conv.lastMessageDirection === "OUTBOUND" ? (
                              <span className="text-emerald-600 font-medium">Tú: </span>
                            ) : null}
                            <span className="text-muted-foreground">{conv.lastMessagePreview}</span>
                          </span>
                        )}
                      </div>
                      {/* StatusIcon: pendiente=atención, closed=resuelta, bot=bot, humano=agente | Indicador mensaje nuevo */}
                      <div className="flex items-center gap-1 shrink-0 min-h-[18px]">
                        {conv.status === "pending" && (
                          <span className="inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[9px] font-medium text-amber-600" title="Necesita atención">
                            <span className="material-symbols-outlined leading-none text-[10px]">priority_high</span>
                            Atención
                          </span>
                        )}
                        {hasPriority(conv.priority) && conv.status !== "pending" && (
                          <span
                            className={cn(
                              "inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[9px] font-medium",
                              PRIORITY_COLORS[conv.priority],
                            )}
                            title={PRIORITY_LABELS[conv.priority]}
                          >
                            <span className={cn("material-symbols-outlined leading-none text-[10px]", PRIORITY_COLORS[conv.priority])}>
                              flag
                            </span>
                            {PRIORITY_LABELS[conv.priority]}
                          </span>
                        )}
                        <div
                          className={cn(
                            "flex items-center justify-center rounded-full size-[18px] shrink-0",
                            conv.status === "closed" ? "bg-[#3FB62F]" : conv.status === "pending" ? "bg-amber-500" : bot ? "bg-orange-500/80" : "bg-destructive/80",
                          )}
                        >
                          {conv.status === "closed" ? (
                            <CheckIcon className="size-2.5 stroke-3 text-white" />
                          ) : conv.status === "pending" ? (
                            <CircleIcon className="size-2.5 stroke-3 text-white" />
                          ) : bot ? (
                            <Bot className="size-2.5 stroke-3 text-white" />
                          ) : (
                            <CircleIcon className="size-2.5 stroke-3 text-white" />
                          )}
                        </div>
                        {/* Indicador de mensaje nuevo (último mensaje del cliente, no visto) */}
                        {mounted &&
                          conv.lastMessageDirection === "INBOUND" &&
                          conv._id !== selectedConversationId &&
                          (() => {
                            try {
                              const stored = localStorage.getItem(`inbox-seen-${conv._id}`);
                              const lastSeen = stored ? Number(stored) : 0;
                              return conv.lastMessageAt > lastSeen;
                            } catch {
                              return false;
                            }
                          })() && (
                            <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: "var(--primaryColor)" }} title="Nuevo mensaje" />
                          )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
            {(!tenantConversations || tenantConversations.length === 0) && (
              <div className="py-12 text-center">
                <span className="material-symbols-outlined text-4xl text-muted-foreground/50">
                  inbox
                </span>
                <p className="mt-2 text-sm font-medium text-muted-foreground">
                  No se encontraron conversaciones
                </p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Panel principal - Chat estilo FincasYa */}
      <main
        className={`flex flex-1 flex-col min-w-0 bg-muted ${sidebarOpen ? "hidden md:flex" : "flex"}`}
      >
        {activeConversation ? (
          <div className="flex flex-1 min-w-0 min-h-0 overflow-hidden">
            <div className="flex flex-1 flex-col min-w-0 min-h-0 overflow-hidden">
              {/* Header estilo FincasYa */}
              <header className="sticky top-0 z-10 shrink-0 border-b border-border bg-background px-4 py-2.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <button
                      type="button"
                      onClick={() => setSidebarOpen(true)}
                      className="md:hidden size-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100"
                    >
                      <span className="material-symbols-outlined">arrow_back</span>
                    </button>
                    <div
                      className="size-10 rounded-lg flex items-center justify-center text-white shrink-0 font-semibold text-sm shadow-sm"
                      style={{
                        background: `linear-gradient(135deg, var(--primaryColor), color-mix(in srgb, var(--primaryColor) 75%, #1a1a2e))`,
                      }}
                    >
                      {activeConversation.customerName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-sm font-semibold truncate text-[#0F172A]">
                        {activeConversation.customerName}
                      </h2>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`text-[11px] font-medium ${
                            activeConversation.status === "pending"
                              ? "text-amber-600"
                              : isBotMode(activeConversation) && activeConversation.status === "open"
                                ? "text-emerald-600"
                                : "text-slate-500"
                          }`}
                        >
                          {activeConversation.status === "pending"
                            ? "Necesita atención humana"
                            : isBotMode(activeConversation)
                              ? "Bot IA"
                              : "Agente"}
                          {" · "}
                          {activeConversation.status === "open"
                            ? "Activo"
                            : activeConversation.status === "closed"
                              ? "Cerrado"
                              : "Pendiente"}
                        </span>
                        {hasPriority(activeConversation.priority) && (
                          <span className="text-[10px] text-slate-400">
                            · {PRIORITY_LABELS[activeConversation.priority]}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {/* Activar / Desactivar Bot - cuando pending (escalado) mostrar "Necesita atención" */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className={`
                          shrink-0 flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition-all
                          ${activeConversation.status === "pending"
                            ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                            : isBotMode(activeConversation)
                              ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"}
                        `}
                        title={
                          activeConversation.status === "pending"
                            ? "Escalado a humano - necesita atención"
                            : isBotMode(activeConversation)
                              ? "Bot activo - click para desactivar"
                              : "Bot desactivado - click para activar"
                        }
                      >
                        <span className="material-symbols-outlined text-base">
                          {activeConversation.status === "pending"
                            ? "priority_high"
                            : isBotMode(activeConversation)
                              ? "smart_toy"
                              : "support_agent"}
                        </span>
                        {activeConversation.status === "pending"
                          ? "Necesita atención"
                          : isBotMode(activeConversation)
                            ? "Bot activo"
                            : "Desactivado"}
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuLabel>Modo de atención</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleSetMode(null)}>
                        <span className="material-symbols-outlined text-lg mr-2">smart_toy</span>
                        Cambiar a Bot (responde automáticamente)
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleSetMode(getHumanUserId())}
                        disabled={!getHumanUserId()}
                      >
                        <span className="material-symbols-outlined text-lg mr-2">support_agent</span>
                        Cambiar a humano
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <div className="flex items-center gap-1 shrink-0">
                    {activeConversation.status !== "closed" ? (
                      <button
                        type="button"
                        onClick={() => handleSetStatus("closed")}
                        className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors"
                        title="Marcar conversación como resuelta"
                      >
                        <CheckCircle2 className="size-4" />
                        Marcar como resuelta
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSetStatus("open")}
                        className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                        title="Reabrir conversación"
                      >
                        Marcar como abierta
                      </button>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="size-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100"
                          title="Prioridad"
                        >
                          <span className={`material-symbols-outlined text-lg ${hasPriority(activeConversation.priority) ? PRIORITY_COLORS[activeConversation.priority] : "text-slate-400"}`}>
                            flag
                          </span>
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Prioridad</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {hasPriority(activeConversation.priority) && (
                          <>
                            <DropdownMenuItem onClick={() => handleSetPriority(null)}>
                              <span className="material-symbols-outlined text-base mr-2 text-muted-foreground">
                                close
                              </span>
                              Quitar prioridad
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                          </>
                        )}
                        {(["low", "normal", "high", "urgent"] as const).map((p) => (
                          <DropdownMenuItem key={p} onClick={() => handleSetPriority(p)}>
                            <span className={`material-symbols-outlined text-base mr-2 ${PRIORITY_COLORS[p]}`}>
                              flag
                            </span>
                            {PRIORITY_LABELS[p]}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <button
                      type="button"
                      onClick={() => setShowContactInfo((x) => !x)}
                      className={`size-9 rounded-lg flex items-center justify-center transition-colors ${
                        showContactInfo ? "bg-(--primarySoft) text-(--primaryColor)" : "text-slate-500 hover:bg-slate-100"
                      }`}
                      title="Info de contacto"
                    >
                      <span className="material-symbols-outlined text-lg">info</span>
                    </button>
                  </div>
                </div>
              </header>

              {/* Mensajes - única zona con scroll */}
              <div className="flex-1 min-h-0 overflow-y-auto p-4 bg-muted/30">
                {messageGroups.map(({ date, messages }) => (
                  <div key={date} className="mb-5">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex-1 h-px bg-slate-200" />
                      <span
                        className="text-[11px] font-medium"
                        style={{ color: "var(--textSecondary)" }}
                      >
                        — {date} —
                      </span>
                      <div className="flex-1 h-px bg-slate-200" />
                    </div>
                    <div className="space-y-4">
                      {messages.map((msg) => (
                        <div
                          key={msg._id}
                          className={`flex ${
                            msg.direction === "OUTBOUND" ? "justify-end" : "justify-start"
                          }`}
                        >
                          <div
                            className={cn(
                              "relative max-w-[85%] rounded-lg px-4 py-3 transition-all",
                              msg.direction === "OUTBOUND" ? "" : "bg-white shadow-sm border border-slate-100",
                            )}
                            style={msg.direction === "OUTBOUND" ? { backgroundColor: "var(--primaryLight)" } : undefined}
                          >
                            {msg.direction === "OUTBOUND" && msg.isBot && (
                              <span
                                className="absolute -top-1.5 left-2 rounded px-1.5 py-0.5 text-[10px] font-medium"
                                style={{
                                  backgroundColor: "var(--primaryLight)",
                                  color: "var(--primaryColor)",
                                }}
                              >
                                Bot IA
                              </span>
                            )}
                            {msg.mediaUrl && (
                              <div className="mb-2 rounded-lg overflow-hidden">
                                {msg.mediaType === "video" ? (
                                  <video
                                    src={msg.mediaUrl}
                                    controls
                                    className="max-h-64 w-full object-contain rounded"
                                  />
                                ) : msg.mediaType === "document" ? (
                                  <div className="rounded-lg overflow-hidden border border-slate-200/80 bg-white shadow-sm">
                                    {/* Vista previa primera página PDF - estilo WhatsApp */}
                                    <div className="relative h-48 sm:h-56 bg-slate-50 overflow-hidden">
                                      <iframe
                                        src={`${msg.mediaUrl}#toolbar=0&navpanes=0&view=FitH`}
                                        className="absolute inset-0 w-full h-full border-0 bg-white"
                                        title="Vista previa PDF"
                                      />
                                    </div>
                                    {/* Card inferior estilo WhatsApp: icono PDF + nombre + abrir */}
                                    <a
                                      href={msg.mediaUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-3 p-3 hover:bg-slate-50 transition-colors border-t border-slate-100"
                                    >
                                      <div className="shrink-0 size-12 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: "#E53935" }}>
                                        PDF
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold truncate" style={{ color: "var(--textPrimary)" }}>
                                          {msg.content && msg.content !== "Documento" ? msg.content : "Documento"}
                                        </p>
                                        <p className="text-[11px] text-slate-500">Toca para abrir</p>
                                      </div>
                                      <span className="material-symbols-outlined text-slate-400 shrink-0">open_in_new</span>
                                    </a>
                                  </div>
                                ) : msg.mediaType === "audio" ? (
                                  <div className="mb-1 -ml-1">
                                    <CustomAudioPlayer
                                      src={msg.mediaUrl}
                                      isContact={msg.direction === "INBOUND"}
                                      avatarSeed={msg.direction === "INBOUND" ? activeConversation?.customerName ?? "user" : "Agente"}
                                      timestamp={new Date(msg.createdAt).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })}
                                    />
                                  </div>
                                ) : (
                                  <div
                                    className="mb-2 max-w-sm rounded-md overflow-hidden border border-black/5 bg-black/5 cursor-pointer relative group"
                                    onClick={() => {
                                      const idx = chatImages.findIndex((img) => img.url === msg.mediaUrl);
                                      setViewerInitialIndex(idx !== -1 ? idx : 0);
                                    }}
                                  >
                                    <img
                                      src={msg.mediaUrl}
                                      alt="Imagen adjunta"
                                      className="object-contain max-h-64 w-full transition-all group-hover:scale-105"
                                    />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                      <span className="text-white text-xs font-medium px-3 py-1.5 bg-black/50 rounded-full backdrop-blur-sm">
                                        Ver foto
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                            {(!msg.mediaUrl || (msg.content && !["Imagen", "Video", "Audio", "Sticker", "Documento"].includes(msg.content) && msg.mediaType !== "document")) && (
                            <p
                              className="text-sm whitespace-pre-wrap wrap-break-word"
                              style={{ color: "var(--textPrimary)" }}
                            >
                              {msg.content}
                            </p>
                            )}
                            <p
                              className="mt-1 text-[10px]"
                              style={{ color: "var(--textSecondary)" }}
                            >
                              {new Date(msg.createdAt).toLocaleTimeString("es", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
                {activeMessages?.length === 0 && (
                  <div className="flex h-40 items-center justify-center">
                    <p className="text-sm" style={{ color: "var(--textSecondary)" }}>
                      No hay mensajes aún
                    </p>
                  </div>
                )}
              </div>

              {/* Input - estilo FincasYa con lucide */}
              <div className="shrink-0 border-t border-border bg-background p-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <input ref={imageInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageChange} />
                <input ref={documentInputRef} type="file" accept=".pdf,.doc,.docx,.txt" multiple className="hidden" onChange={handleDocumentChange} />
                {pendingAttachments.length > 0 && (
                  <div className="mb-2 flex items-center gap-2 overflow-x-auto pb-1">
                    {pendingAttachments.map((att, i) => (
                      <div key={i} className="relative shrink-0 group">
                        {att.type === "image" && att.preview ? (
                          <img src={att.preview} alt="" className="w-14 h-14 rounded-lg object-cover border border-slate-200" />
                        ) : (
                          <div className="w-14 h-14 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center">
                            <span className="material-symbols-outlined text-slate-400 text-xl">
                              {att.type === "document" ? "description" : "audiotrack"}
                            </span>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveAttachment(i)}
                          className="absolute -top-0.5 -right-0.5 size-5 rounded-full bg-slate-700 text-white flex items-center justify-center hover:bg-slate-800 text-xs"
                          title="Quitar"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setPendingAttachments((prev) => {
                          prev.forEach((a) => a.preview && URL.revokeObjectURL(a.preview));
                          return [];
                        });
                        setPreviewIndex(0);
                      }}
                      className="shrink-0 text-xs text-slate-500 hover:text-red-600 ml-1"
                    >
                      Quitar todo
                    </button>
                  </div>
                )}
                <div className="flex items-end gap-2 p-1 border rounded-lg bg-background overflow-hidden relative focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                  <div className="flex items-center gap-0.5 pb-1.5 pl-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => documentInputRef.current?.click()}
                      className="size-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground"
                      title="Adjuntar Documento"
                    >
                      <Paperclip className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => imageInputRef.current?.click()}
                      className="size-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground"
                      title="Adjuntar Imagen"
                    >
                      <ImageIcon className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => (isRecording ? handleStopRecording() : handleStartRecording())}
                      className={`size-9 rounded-lg flex items-center justify-center ${isRecording ? "bg-red-100 text-red-600 animate-pulse" : "text-muted-foreground hover:text-foreground"}`}
                      title={isRecording ? "Detener grabación" : "Grabar nota de voz"}
                    >
                      <Mic className="h-5 w-5" />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
                    placeholder={pendingAttachments.length ? "Añadir mensaje (opcional)..." : "Escribe tu mensaje como operador..."}
                    className="flex-1 min-h-[44px] py-2 pl-2 pr-2 bg-transparent border-none text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-0"
                  />
                  <button
                    type="button"
                    onClick={handleSendMessage}
                    disabled={(!replyText.trim() && !pendingAttachments.length) || sending}
                    className="size-9 shrink-0 rounded-lg flex items-center justify-center text-white bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Enviar"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
                {sendError && <p className="mt-1 text-xs text-red-600">{sendError}</p>}
              </div>
            </div>

            {/* Panel info contacto (imágenes, videos, datos) */}
            {showContactInfo && (
              <aside
                className="w-72 shrink-0 border-l border-slate-200 bg-slate-50/50 flex flex-col overflow-hidden"
                style={{ backgroundColor: "var(--backgroundSoft)" }}
              >
                <div className="p-4 border-b border-slate-200 shrink-0">
                  <h3 className="text-sm font-semibold" style={{ color: "var(--textPrimary)" }}>
                    Información de contacto
                  </h3>
                  <div className="mt-3 space-y-2 text-sm">
                    <p>
                      <span className="text-slate-500">Nombre:</span>{" "}
                      {activeConversation.customerName}
                    </p>
                    <p>
                      <span className="text-slate-500">Canal:</span>{" "}
                      {activeConversation.channel}
                    </p>
                    <p>
                      <span className="text-slate-500">Contacto:</span>{" "}
                      {activeConversation.externalContactId.replace(/^whatsapp:/, "")}
                    </p>
                    {hasPriority(activeConversation.priority) && (
                    <p>
                      <span className="text-slate-500">Prioridad:</span>{" "}
                      {PRIORITY_LABELS[activeConversation.priority]}
                    </p>
                    )}
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                    Imágenes y videos enviados
                  </h4>
                  {mediaMessages.length === 0 ? (
                    <p className="text-xs text-slate-500">
                      No hay archivos en esta conversación
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {mediaMessages.map((m) =>
                        m.mediaUrl ? (
                          <div key={m._id} className="rounded-lg overflow-hidden bg-white border border-slate-200">
                            {m.mediaType === "video" ? (
                              <video
                                src={m.mediaUrl}
                                className="w-full aspect-square object-cover"
                              />
                            ) : m.mediaType === "document" ? (
                              <a
                                href={m.mediaUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex flex-col items-center justify-center p-3 aspect-square hover:bg-slate-50 group"
                              >
                                <div className="size-10 rounded flex items-center justify-center text-white font-bold text-xs" style={{ backgroundColor: "#E53935" }}>PDF</div>
                                <span className="text-[10px] truncate max-w-full mt-2 text-slate-600 group-hover:text-slate-900">{m.content || "Documento"}</span>
                              </a>
                            ) : (
                              <a href={m.mediaUrl} target="_blank" rel="noopener noreferrer">
                                <img
                                  src={m.mediaUrl}
                                  alt=""
                                  className="w-full aspect-square object-cover hover:opacity-95"
                                />
                              </a>
                            )}
                          </div>
                        ) : null
                      )}
                    </div>
                  )}
                </div>
              </aside>
            )}
          </div>
        ) : (
          /* Área vacía estilo FincasYa */
          <div className="flex flex-1 flex-col items-center justify-center p-8 text-center bg-[#fafafa]">
            <div className="animate-in fade-in zoom-in duration-700">
              <span className="material-symbols-outlined text-6xl text-muted-foreground/60 mb-4 block">
                forum
              </span>
              <h2 className="text-xl font-semibold tracking-tight text-foreground">
                Bandeja de mensajes
              </h2>
              <p className="text-muted-foreground mt-2 max-w-sm text-sm mx-auto">
                Elige una conversación de la lista lateral para empezar a chatear
                con tus clientes.
              </p>
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="md:hidden mt-4 rounded-lg px-4 py-2 text-sm font-medium bg-muted hover:bg-muted/80 text-foreground"
              >
                Ver conversaciones
              </button>
            </div>
          </div>
        )}

        {/* Modales estilo FincasYa */}
        {viewerInitialIndex !== null && chatImages.length > 0 && (
          <ImageViewerModal
            images={chatImages}
            initialIndex={viewerInitialIndex}
            onClose={() => setViewerInitialIndex(null)}
          />
        )}
        {selectedImages.length > 0 && activeConversation && (
          <ImagePreviewModal
            initialFiles={selectedImages}
            onClose={() => setSelectedImages([])}
            onSend={handleSendImages}
            isSending={sending}
          />
        )}
        {selectedDocuments.length > 0 && activeConversation && (
          <DocumentPreviewModal
            initialFiles={selectedDocuments}
            onClose={() => setSelectedDocuments([])}
            onSend={handleSendDocuments}
            isSending={sending}
          />
        )}

        {/* Menú contextual (clic derecho) en conversaciones */}
        {contextMenu && (
          <div
            ref={contextMenuRef}
            className="fixed z-100 min-w-[200px] overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-xl"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-3 py-2 text-xs font-semibold text-slate-500">
              Acciones rápidas
            </div>
            <button
              type="button"
              onClick={() => handleSetStatus("closed")}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-left hover:bg-slate-100"
            >
              <CheckCircle2 className="size-4 text-emerald-600" />
              Marcar como resuelta
            </button>
            <button
              type="button"
              onClick={() => handleSetStatus("open")}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-left hover:bg-slate-100"
            >
              <span className="material-symbols-outlined text-lg">lock_open</span>
              Marcar como abierta
            </button>
            <div className="my-1 h-px bg-slate-100" />
            <button
              type="button"
              onClick={() => handleContextMenuSetMode(null)}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-left hover:bg-slate-100"
            >
              <Bot className="size-4" />
              Cambiar a Bot
            </button>
            <button
              type="button"
              onClick={() => handleContextMenuSetMode(getHumanUserId())}
              disabled={!getHumanUserId()}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-left hover:bg-slate-100 disabled:opacity-50 disabled:pointer-events-none"
            >
              <CircleIcon className="size-4" />
              Cambiar a humano
            </button>
            <div className="my-1 h-px bg-slate-100" />
            <div className="px-3 py-1 text-[10px] font-medium text-slate-400">
              Prioridad
            </div>
            {(["low", "normal", "high", "urgent"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => handleSetPriority(p)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-left hover:bg-slate-100",
                  PRIORITY_COLORS[p]
                )}
              >
                <span className="material-symbols-outlined text-base">flag</span>
                {PRIORITY_LABELS[p]}
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
