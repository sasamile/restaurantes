/** Formatea número con separador de miles (punto para español) */
export function formatPrice(value: number): string {
  return (value || 0).toLocaleString("es-CL", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

/** Parsea string formateado a número (ej: "1.500" -> 1500) */
export function parsePrice(value: string): number {
  const digits = value.replace(/\D/g, "");
  return digits === "" ? 0 : Number(digits);
}
