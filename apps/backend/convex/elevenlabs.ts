import { action } from "./_generated/server";
import { v } from "convex/values";

// Valentina - Medellín (voz colombiana conversacional)
const VOICE_ID = "3Fx71T889APcHRu4VtQf";
// Modelo Turbo/Flash conversacional (32 idiomas, baja latencia)
const MODEL_ID = "eleven_flash_v2_5";

/**
 * Sintetiza texto a audio con ElevenLabs TTS.
 * Usa ELEVENLABS_API_KEY en variables de entorno de Convex.
 */
export const synthesize = action({
  args: { text: v.string() },
  handler: async (_ctx, args) => {
    const t = args.text.trim();
    if (!t) return null;

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      throw new Error("ELEVENLABS_API_KEY no está configurada en Convex");
    }

    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_22050_32`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": apiKey,
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({ text: t, model_id: MODEL_ID }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`ElevenLabs: ${res.status} - ${err}`);
    }

    const buf = await res.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  },
});
