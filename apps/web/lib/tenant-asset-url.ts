/**
 * URLs de logos almacenadas en S3/Convex suelen tener políticas que solo permiten
 * el dominio principal (Referer). En dominios custom el <img> directo falla.
 * El proxy /api/tenant-asset sirve el archivo desde el mismo host del front.
 */
export function isTenantAssetProxyAllowed(urlStr: string): boolean {
  let u: URL;
  try {
    u = new URL(urlStr);
  } catch {
    return false;
  }
  if (u.protocol !== "https:") return false;
  const h = u.hostname.toLowerCase();
  if (/\.s3\.[a-z0-9-]+\.amazonaws\.com$/i.test(h) || /\.s3\.amazonaws\.com$/i.test(h)) {
    return u.pathname.startsWith("/logos/");
  }
  if (h.endsWith(".convex.cloud") && u.pathname.startsWith("/api/storage/")) {
    return true;
  }
  return false;
}

export function proxiedTenantAssetUrl(
  url: string | null | undefined
): string | undefined {
  if (!url?.trim()) return undefined;
  const t = url.trim();
  if (!t.startsWith("http")) return t;
  if (!isTenantAssetProxyAllowed(t)) return t;
  return `/api/tenant-asset?url=${encodeURIComponent(t)}`;
}
