import { NextRequest, NextResponse } from "next/server";
import { isTenantAssetProxyAllowed } from "@/lib/tenant-asset-url";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("url");
  if (!raw || !isTenantAssetProxyAllowed(raw)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const upstream = await fetch(raw, {
    headers: { Accept: "image/*,*/*" },
    next: { revalidate: 3600 },
  });

  if (!upstream.ok) {
    return new NextResponse("Upstream error", { status: 502 });
  }

  const contentType =
    upstream.headers.get("content-type") ?? "application/octet-stream";
  const body = await upstream.arrayBuffer();

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  });
}
