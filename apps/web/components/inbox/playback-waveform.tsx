"use client";

import { useEffect, useRef } from "react";

interface PlaybackWaveformProps {
  audioUrl: string | null;
  currentTime: number;
  duration: number;
}

export function PlaybackWaveform({ audioUrl, currentTime, duration }: PlaybackWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const waveDataRef = useRef<number[]>([]);

  useEffect(() => {
    if (!audioUrl) return;

    const generateWaveform = async () => {
      try {
        const response = await fetch(audioUrl);
        const arrayBuffer = await response.arrayBuffer();
        const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        const channelData = audioBuffer.getChannelData(0);

        const barCount = 40;
        const step = Math.floor(channelData.length / barCount);
        const bars: number[] = [];

        for (let i = 0; i < barCount; i++) {
          let sum = 0;
          for (let j = 0; j < step; j++) {
            sum += Math.abs(channelData[i * step + j] ?? 0);
          }
          bars.push(sum / step);
        }

        const max = Math.max(...bars, 0.01);
        waveDataRef.current = bars.map((b) => b / max);
        drawWaveform();
      } catch {
        waveDataRef.current = Array.from({ length: 40 }, () => 0.15 + Math.random() * 0.85);
        drawWaveform();
      }
    };

    generateWaveform();
  }, [audioUrl]);

  const drawWaveform = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.offsetWidth * dpr;
    canvas.height = canvas.offsetHeight * dpr;
    ctx.scale(dpr, dpr);

    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;
    const bars = waveDataRef.current;
    const barCount = bars.length;
    if (barCount === 0) return;

    const gap = 2.5;
    const barWidth = (width - (barCount - 1) * gap) / barCount;
    const progress = duration > 0 ? currentTime / duration : 0;

    ctx.clearRect(0, 0, width, height);

    const styles = getComputedStyle(canvas);
    const playedColor = styles.getPropertyValue("--color-bubble-wave-played").trim() || "rgba(255,255,255,0.9)";
    const unplayedColor = styles.getPropertyValue("--color-bubble-wave-unplayed").trim() || "rgba(255,255,255,0.35)";
    const dotColor = styles.getPropertyValue("--color-bubble-wave-dot").trim() || "#00d0ff";

    for (let i = 0; i < barCount; i++) {
      const value = bars[i] ?? 0.15;
      const barHeight = Math.max(3, value * height * 0.85);
      const x = i * (barWidth + gap);
      const y = (height - barHeight) / 2;
      const barProgress = (i + 1) / barCount;
      ctx.fillStyle = barProgress <= progress ? playedColor : unplayedColor;
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, 1.5);
      ctx.fill();
    }

    const currentX = Math.max(0, Math.min(progress * width, width));
    ctx.fillStyle = dotColor;
    ctx.beginPath();
    ctx.arc(currentX, height / 2, 6, 0, 2 * Math.PI);
    ctx.fill();
  };

  useEffect(() => {
    drawWaveform();
  }, [currentTime, duration]);

  return <canvas ref={canvasRef} className="h-full w-full" aria-label="Forma de onda" />;
}
