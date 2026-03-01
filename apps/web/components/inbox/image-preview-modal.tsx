"use client";

import { useState, useEffect, useRef } from "react";
import { X, Plus, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ImagePreviewModalProps {
  initialFiles: File[];
  onClose: () => void;
  onSend: (items: { file: File; caption: string }[]) => void;
  isSending?: boolean;
}

interface MediaItem {
  id: string;
  file: File;
  previewUrl: string;
  caption: string;
}

export function ImagePreviewModal({
  initialFiles,
  onClose,
  onSend,
  isSending = false,
}: ImagePreviewModalProps) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isExiting, setIsExiting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => onClose(), 250);
  };

  useEffect(() => {
    if (initialFiles?.length > 0) {
      const newItems = initialFiles.map((file) => ({
        id: Math.random().toString(36).substring(2, 9),
        file,
        previewUrl: URL.createObjectURL(file),
        caption: "",
      }));
      setItems(newItems);
      setCurrentIndex(0);
    }
  }, [initialFiles]);

  useEffect(() => {
    return () => {
      items.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    };
  }, []);

  const handleAddFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const addedFiles = Array.from(e.target.files ?? []);
    if (!addedFiles.length) return;
    const newItems = addedFiles.map((file) => ({
      id: Math.random().toString(36).substring(2, 9),
      file,
      previewUrl: URL.createObjectURL(file),
      caption: "",
    }));
    setItems((prev) => [...prev, ...newItems]);
    setCurrentIndex(items.length);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemove = (e: React.MouseEvent, idToRemove: string) => {
    e.stopPropagation();
    const itemToRemove = items.find((i) => i.id === idToRemove);
    if (itemToRemove) URL.revokeObjectURL(itemToRemove.previewUrl);
    const indexToRemove = items.findIndex((i) => i.id === idToRemove);
    const newItems = items.filter((i) => i.id !== idToRemove);
    setItems(newItems);
    if (newItems.length === 0) handleClose();
    else {
      if (currentIndex >= newItems.length) setCurrentIndex(newItems.length - 1);
      else if (indexToRemove < currentIndex) setCurrentIndex(currentIndex - 1);
    }
  };

  const handleCaptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[currentIndex] = { ...updated[currentIndex], caption: e.target.value };
      return updated;
    });
  };

  const handleSubmit = () => {
    if (isSending || items.length === 0) return;
    onSend(items.map((item) => ({ file: item.file, caption: item.caption })));
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
      if (e.key === "ArrowRight") setCurrentIndex((p) => Math.min(items.length - 1, p + 1));
      if (e.key === "ArrowLeft") setCurrentIndex((p) => Math.max(0, p - 1));
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [items.length]);

  if (items.length === 0) return null;

  const currentItem = items[currentIndex];

  return (
    <div
      className={cn(
        "absolute inset-0 z-50 overflow-hidden bg-muted/95 backdrop-blur-sm",
        !isExiting ? "animate-in fade-in duration-300" : "animate-out fade-out duration-300",
      )}
    >
      <div
        className={cn(
          "flex flex-col h-full w-full",
          !isExiting ? "animate-in slide-in-from-bottom-24 duration-300" : "animate-out slide-out-to-bottom-24 duration-300",
        )}
      >
        <div className="absolute top-4 right-4 z-60">
          <Button variant="outline" onClick={handleClose} className="rounded-full shadow-sm h-10 w-10 p-0" disabled={isSending}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-hidden relative flex items-center justify-center p-4 min-h-0 shrink">
          {currentItem && (
            <img
              key={currentItem.id}
              src={currentItem.previewUrl}
              alt="Preview"
              className="w-full h-full object-contain select-none animate-in zoom-in-95 duration-200"
            />
          )}
        </div>

        <div className="bg-background border-t w-full shrink-0 flex flex-col">
          <div className="max-w-3xl w-full mx-auto px-4 pb-4 pt-4 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-muted rounded-lg overflow-hidden flex items-center px-4 h-12 shadow-sm border focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 transition-all">
                <input
                  ref={inputRef}
                  type="text"
                  autoFocus
                  value={currentItem?.caption || ""}
                  onChange={handleCaptionChange}
                  placeholder="Escribe un mensaje"
                  className="w-full bg-transparent border-none text-foreground text-[15px] placeholder:text-muted-foreground focus:outline-none focus:ring-0"
                  disabled={isSending}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit();
                    }
                  }}
                />
              </div>
              <button
                onClick={handleSubmit}
                disabled={isSending}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-50 shadow-md"
              >
                {isSending ? <Loader2 className="h-5 w-5 text-white animate-spin" /> : <Send className="h-5 w-5 text-white ml-0.5" />}
              </button>
            </div>

            <div className="flex items-center justify-center pt-2 overflow-x-auto pb-2 gap-2">
              {items.map((item, idx) => (
                <div
                  key={item.id}
                  onClick={() => setCurrentIndex(idx)}
                  className={cn(
                    "relative h-[52px] w-[52px] shrink-0 cursor-pointer overflow-hidden rounded-md border-2 transition-all shadow-sm",
                    currentIndex === idx ? "border-primary scale-100" : "border-border opacity-70 hover:opacity-100 scale-95 hover:scale-100",
                  )}
                >
                  <img src={item.previewUrl} alt={`thumbnail-${idx}`} className="h-full w-full object-cover select-none pointer-events-none" />
                  {currentIndex === idx && (
                    <div
                      className="absolute top-0 right-0 p-1 cursor-pointer hover:bg-black/10 rounded-bl-md transition-colors bg-black/20"
                      onClick={(e) => handleRemove(e, item.id)}
                      title="Eliminar"
                    >
                      <X className="h-3.5 w-3.5 text-white drop-shadow-md" />
                    </div>
                  )}
                </div>
              ))}
              <div
                className="flex h-[52px] w-[52px] shrink-0 cursor-pointer items-center justify-center rounded-md border-2 border-dashed border-muted-foreground/30 text-muted-foreground hover:bg-muted hover:text-foreground transition-all scale-95 hover:scale-100"
                onClick={() => fileInputRef.current?.click()}
                title="Añadir más archivos"
              >
                <Plus className="h-6 w-6" />
              </div>
              <input type="file" multiple accept="image/*" className="hidden" ref={fileInputRef} onChange={handleAddFiles} disabled={isSending} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
