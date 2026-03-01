"use client";

import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

export interface ChatImageItem {
  url: string;
  text?: string;
}

interface ImageViewerModalProps {
  images: ChatImageItem[];
  initialIndex: number;
  onClose: () => void;
}

export function ImageViewerModal({
  images,
  initialIndex = 0,
  onClose,
}: ImageViewerModalProps) {
  const [mounted, setMounted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setCurrentIndex((p) => (p + 1) % images.length);
      if (e.key === "ArrowLeft") setCurrentIndex((p) => (p - 1 + images.length) % images.length);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, images.length]);

  if (!images || images.length === 0 || !mounted) return null;

  const handleNext = () => setCurrentIndex((p) => (p + 1) % images.length);
  const handlePrev = () => setCurrentIndex((p) => (p - 1 + images.length) % images.length);

  return createPortal(
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/90 animate-in fade-in duration-200">
      <div className="absolute top-4 right-4 z-110">
        <Button
          variant="ghost"
          onClick={onClose}
          className="text-white/70 hover:text-white hover:bg-white/10 rounded-full h-10 w-10 p-0"
        >
          <X className="h-6 w-6" />
        </Button>
      </div>

      <div className="flex flex-col h-full w-full">
        <div
          className="relative flex-1 flex flex-col items-center justify-center p-4 md:p-16 min-h-0"
          onClick={onClose}
        >
          {images.length > 1 && (
            <>
              <Button
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrev();
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-110 text-white/70 hover:text-white hover:bg-white/10 rounded-full h-12 w-12 p-0 hidden sm:flex"
              >
                <ChevronLeft className="h-8 w-8" />
              </Button>
              <Button
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  handleNext();
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-110 text-white/70 hover:text-white hover:bg-white/10 rounded-full h-12 w-12 p-0 hidden sm:flex"
              >
                <ChevronRight className="h-8 w-8" />
              </Button>
              <div className="absolute top-6 left-1/2 -translate-x-1/2 text-white/90 text-sm font-medium tracking-wide z-110 drop-shadow-md">
                {currentIndex + 1} / {images.length}
              </div>
            </>
          )}

          <img
            key={images[currentIndex].url}
            src={images[currentIndex].url}
            alt={`Chat image ${currentIndex + 1}`}
            className="max-w-full min-h-0 object-contain select-none shadow-2xl animate-in fade-in duration-300 shrink"
            onClick={(e) => e.stopPropagation()}
          />
          {images[currentIndex].text && (
            <div
              className="mt-4 shrink-0 px-4 py-2 text-white text-sm md:text-base max-w-2xl text-center animate-in slide-in-from-bottom-2 duration-300"
              onClick={(e) => e.stopPropagation()}
            >
              {images[currentIndex].text}
            </div>
          )}
        </div>

        {images.length > 1 && (
          <div className="w-full shrink-0 flex flex-col z-110">
            <div className="max-w-3xl w-full mx-auto px-4 pb-4 pt-4 flex flex-col gap-4">
              <div className="flex items-center justify-center overflow-x-auto pb-2 gap-2">
                {images.map((img, idx) => (
                  <div
                    key={img.url + idx}
                    onClick={() => setCurrentIndex(idx)}
                    className={cn(
                      "relative h-[52px] w-[52px] shrink-0 cursor-pointer overflow-hidden rounded-md border-2 transition-all shadow-sm",
                      currentIndex === idx ? "border-primary scale-100" : "border-transparent opacity-50 hover:opacity-100 scale-95 hover:scale-100",
                    )}
                  >
                    <img
                      src={img.url}
                      alt={`thumbnail-${idx}`}
                      className="h-full w-full object-cover select-none pointer-events-none"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
