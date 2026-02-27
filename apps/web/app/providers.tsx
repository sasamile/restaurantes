"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";

const url = process.env.NEXT_PUBLIC_CONVEX_URL;
const isConfigured = url && url.length > 0 && !url.includes("placeholder");

export function Providers({ children }: { children: React.ReactNode }) {
  if (!isConfigured) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white p-8">
        <div className="max-w-md rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <h2 className="font-semibold text-red-800">Convex no configurado</h2>
          <p className="mt-2 text-sm text-red-700">
            Añade <code className="rounded bg-red-100 px-1">NEXT_PUBLIC_CONVEX_URL</code> en{" "}
            <code className="rounded bg-red-100 px-1">apps/web/.env.local</code>. Ejecuta{" "}
            <code className="rounded bg-red-100 px-1">npx convex dev</code> en{" "}
            <code className="rounded bg-red-100 px-1">apps/backend</code> para obtener la URL del deployment.
          </p>
        </div>
      </div>
    );
  }

  const convex = new ConvexReactClient(url);
  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
