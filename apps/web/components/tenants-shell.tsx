"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode } from "react";
import { useAuth } from "@/lib/auth-context";
import { useTenant } from "@/lib/tenant-context";
import { useQuery } from "convex/react";
import { api } from "@/convex";
import type { Id } from "@/convex";

interface TenantsShellProps {
  children: ReactNode;
}

export function TenantsShell({ children }: TenantsShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { tenantId } = useTenant();

  const tenant = useQuery(
    api.tenants.get,
    tenantId ? { tenantId } : "skip"
  );
  const ycloud = useQuery(
    api.integrations.getYCloud,
    tenantId ? { tenantId } : "skip"
  );

  const baseHref = "/tenants";
  const ycloudConnected = ycloud?.connected ?? false;

  const isActive = (href: string) =>
    pathname === href || (href !== "/tenants" && pathname.startsWith(href));

  return (
    <div className="flex h-screen overflow-hidden bg-[#f6f7f8] text-slate-900 font-(--font-inter)">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 flex flex-col justify-between border-r border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-8">
          <Link href="/tenants" className="flex items-center gap-3 px-2">
            <div className="size-10 rounded-full bg-[#197fe6] flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-xl">restaurant</span>
            </div>
            <div className="flex flex-col">
              <h1 className="text-slate-900 text-base font-bold leading-none">
                RestoAdmin
              </h1>
              <p className="text-slate-500 text-xs font-normal">
                {tenant?.name ?? "Panel"}
              </p>
            </div>
          </Link>

          <nav className="flex flex-col gap-1">
            <Link
              href="/tenants"
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                pathname === "/tenants"
                  ? "bg-[#197fe6] text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <span className="material-symbols-outlined">dashboard</span>
              <span className="text-sm font-medium">Dashboard</span>
            </Link>

            {tenantId ? (
              <>
                {ycloudConnected ? (
                  <Link
                    href={`${baseHref}/inbox`}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                      isActive(`${baseHref}/inbox`)
                        ? "bg-[#197fe6] text-white"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <span className="material-symbols-outlined">mail</span>
                    <span className="text-sm font-medium">Inbox</span>
                  </Link>
                ) : (
                  <span
                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 cursor-not-allowed"
                    title="Conecta YCloud en Integraciones para habilitar el Inbox"
                  >
                    <span className="material-symbols-outlined">mail</span>
                    <span className="text-sm font-medium">Inbox</span>
                    <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">Deshabilitado</span>
                  </span>
                )}
                <Link
                  href={`${baseHref}/knowledge`}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    isActive(`${baseHref}/knowledge`)
                      ? "bg-[#197fe6] text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <span className="material-symbols-outlined">menu_book</span>
                  <span className="text-sm font-medium">Conocimiento</span>
                </Link>
            
                <Link
                  href={`${baseHref}/integraciones`}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    isActive(`${baseHref}/integraciones`)
                      ? "bg-[#197fe6] text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <span className="material-symbols-outlined">link</span>
                  <span className="text-sm font-medium">Integraciones</span>
                </Link>
                <Link
                  href={`${baseHref}/users`}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    isActive(`${baseHref}/users`)
                      ? "bg-[#197fe6] text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <span className="material-symbols-outlined">group</span>
                  <span className="text-sm font-medium">Usuarios</span>
                </Link>
              </>
            ) : null}
          </nav>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3 p-2 rounded-lg border border-slate-200">
            <div className="size-8 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden">
              <span className="material-symbols-outlined text-slate-500 text-sm">
                person
              </span>
            </div>
            <div className="flex flex-col overflow-hidden flex-1 min-w-0">
              <p className="text-xs font-bold truncate">{user?.name ?? "Usuario"}</p>
              <p className="text-[10px] text-slate-500 truncate">
                {user?.email ?? ""}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                logout();
                router.push("/login");
              }}
              className="text-slate-400 hover:text-slate-600 p-1"
              title="Cerrar sesión"
            >
              <span className="material-symbols-outlined text-base">logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 shrink-0 border-b border-slate-200 bg-white/80 backdrop-blur-md px-8 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative w-full max-w-md">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">
                search
              </span>
              <input
                className="w-full bg-slate-100 border-none rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-[#197fe6]/50 text-slate-900"
                placeholder="Buscar pedidos, clientes..."
                type="text"
                readOnly
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="size-10 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors relative"
            >
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <div className="text-xs font-medium text-slate-500">
              {new Date().toLocaleDateString("es-ES", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">{children}</div>
      </main>
    </div>
  );
}
