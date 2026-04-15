import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function stripHost(host: string) {
  return host.split(":")[0]?.toLowerCase().replace(/^www\./, "") ?? "";
}

/**
 * Dominio “oficial” del SaaS (ej. restaurantes.cloud).
 * En Vercel: Project → Settings → Environment Variables:
 * NEXT_PUBLIC_SAAS_HOST=restaurantes.cloud
 *
 * En dominios personalizados de clientes (ej. gestia.com.co) no debe existir el panel superadmin:
 * es la misma app, pero solo rutas de tenant + login.
 */
export function middleware(request: NextRequest) {
  const saasHost = process.env.NEXT_PUBLIC_SAAS_HOST?.trim();
  if (!saasHost) return NextResponse.next();

  const primary = stripHost(saasHost);
  if (!primary) return NextResponse.next();

  const rawHost = request.headers.get("host") ?? "";
  const host = stripHost(rawHost);

  const isPrimary =
    host === primary ||
    host === "localhost" ||
    host === "127.0.0.1" ||
    host.endsWith(".vercel.app");

  if (isPrimary) return NextResponse.next();

  if (request.nextUrl.pathname.startsWith("/superadmin")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/superadmin/:path*"],
};
