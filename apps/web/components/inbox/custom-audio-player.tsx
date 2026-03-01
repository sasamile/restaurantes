"use client";

import { useState, useRef, useEffect } from "react";
import { Play, Pause } from "lucide-react";
import { cn } from "@/lib/utils";
import { PlaybackWaveform } from "./playback-waveform";

interface CustomAudioPlayerProps {
  src: string;
  className?: string;
  isContact?: boolean;
  avatarSeed?: string;
  timestamp?: string;
}

export function CustomAudioPlayer({ src, className, isContact = false, timestamp }: CustomAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const setAudioData = () => {
      if (audio.duration && audio.duration !== Infinity) setDuration(audio.duration);
    };
    const setAudioTime = () => setCurrentTime(audio.currentTime);
    const handleEnd = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      audio.currentTime = 0;
    };

    audio.addEventListener("loadedmetadata", setAudioData);
    audio.addEventListener("loadeddata", setAudioData);
    audio.addEventListener("timeupdate", setAudioTime);
    audio.addEventListener("ended", handleEnd);

    if (audio.readyState >= 1 && audio.duration && audio.duration !== Infinity) setDuration(audio.duration);

    return () => {
      audio.removeEventListener("loadedmetadata", setAudioData);
      audio.removeEventListener("loadeddata", setAudioData);
      audio.removeEventListener("timeupdate", setAudioTime);
      audio.removeEventListener("ended", handleEnd);
    };
  }, [src]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = playbackSpeed;
  }, [playbackSpeed]);

  const togglePlaybackSpeed = () => {
    const speeds = [1, 1.5, 2];
    const nextIndex = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
    setPlaybackSpeed(speeds[nextIndex]!);
    if (audioRef.current) audioRef.current.playbackRate = speeds[nextIndex]!;
  };

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) audio.pause();
    else audio.play().catch(console.error);
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const time = Number(e.target.value);
    audio.currentTime = time;
    setCurrentTime(time);
  };

  const formatTime = (time: number) => {
    if (!time || isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  return (
    <div className={cn("flex items-stretch gap-2 min-w-[280px] sm:min-w-[310px] w-full max-w-sm relative", className)}>
      <audio ref={audioRef} src={src} preload="metadata" />

      <div className="flex flex-col items-center justify-start shrink-0">
        <button
          onClick={togglePlayPause}
          className={cn(
            "h-[38px] w-[38px] sm:h-[42px] sm:w-[42px] rounded-lg sm:rounded-[10px] flex items-center justify-center transition-all hover:scale-105 active:scale-95",
            isContact ? "text-emerald-600 hover:bg-emerald-50" : "text-white hover:bg-white/10",
          )}
        >
          {isPlaying ? <Pause className="h-5 w-5 sm:h-6 sm:w-6 fill-current" /> : <Play className="h-5 w-5 sm:h-6 sm:w-6 fill-current ml-0.5" />}
        </button>
        <span className={cn("text-[9px] sm:text-[10px] font-bold mt-1 tracking-wide", isContact ? "text-emerald-700/80" : "text-white/90")}>
          {formatTime(currentTime > 0 ? currentTime : duration)}
        </span>
      </div>

      <div className="flex-1 relative flex items-center h-auto min-w-0 mx-1 self-stretch">
        <div
          className="absolute inset-x-0 top-1/2 -translate-y-[65%] sm:-translate-y-[60%] h-[32px] sm:h-[38px] pointer-events-none"
          style={
            {
              "--color-bubble-wave-played": isContact ? "rgba(16, 185, 129, 0.9)" : "rgba(255, 255, 255, 1)",
              "--color-bubble-wave-unplayed": isContact ? "rgba(16, 185, 129, 0.35)" : "rgba(255, 255, 255, 0.4)",
              "--color-bubble-wave-dot": "#00d0ff",
            } as React.CSSProperties
          }
        >
          <PlaybackWaveform audioUrl={src} currentTime={currentTime} duration={duration} />
        </div>
        <input
          type="range"
          min={0}
          max={duration || 100}
          step={0.1}
          value={currentTime}
          onChange={handleSeek}
          title="Buscar"
          className="w-full h-full absolute inset-0 appearance-none bg-transparent cursor-pointer z-10 opacity-0"
        />
      </div>

      <div className="flex flex-col items-end justify-between shrink-0 h-auto self-stretch">
        <button
          onClick={togglePlaybackSpeed}
          className={cn(
            "px-2 h-[22px] min-w-[34px] rounded-full text-[10px] font-bold transition-all hover:bg-white/10 active:scale-95 border",
            isContact ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-white/15 text-white border-white/30 shadow-sm",
          )}
        >
          {playbackSpeed}x
        </button>
        {timestamp && (
          <span className={cn("text-[9px] sm:text-[10px] mb-[2px] tracking-wide", isContact ? "text-emerald-700/80" : "text-white/90")}>{timestamp}</span>
        )}
      </div>
    </div>
  );
}
