/**
 * Re-exporta la API de Convex desde el backend del monorepo.
 * Asegúrate de tener NEXT_PUBLIC_CONVEX_URL en .env.local
 */
export { api } from "../backend/convex/_generated/api";
export type { Id } from "../backend/convex/_generated/dataModel";
