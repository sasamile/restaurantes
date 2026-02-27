"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, ReactNode } from "react";
import { useAuth } from "@/lib/auth-context";

interface SuperadminShellProps {
  children: ReactNode;
}

const NAV_ITEMS = [
  { href: "/superadmin", label: "Inicio" },
  { href: "/superadmin/restaurantes", label: "Restaurantes" },
  { href: "/superadmin/planes", label: "Planes" },
] as const;

export function SuperadminShell({ children }: SuperadminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    if (!user || !user.isSuperadmin) {
      router.replace("/login");
    }
  }, [user, isLoading, router]);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const isActive = (href: string) =>
    pathname === href || (href !== "/superadmin" && pathname.startsWith(href));

  if (isLoading || !user?.isSuperadmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-slate-500">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-white text-slate-800">
      <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white px-5 py-6 shadow-sm md:flex md:flex-col">
        <Link
          href="/superadmin"
          className="mb-8 flex items-center gap-3"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-600 text-lg font-bold text-white shadow-md shadow-red-600/30">
            R
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-800">
              Restaurantes SaaS
            </p>
            <p className="text-xs text-slate-500">Panel Superadmin</p>
          </div>
        </Link>

        <nav className="space-y-1">
          <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Superadmin
          </p>
          {NAV_ITEMS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                isActive(href)
                  ? "bg-red-50 text-red-700"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="mt-auto pt-6">
          <p className="mb-1 px-3 text-xs text-slate-400">{user.email}</p>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <header className="border-b border-slate-200 bg-white px-6 py-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-slate-800">
                Panel Superadmin
              </h1>
              <p className="text-sm text-slate-500">
                Gestiona restaurantes, planes, administradores y permisos.
              </p>
            </div>
          </div>
        </header>

        <div className="bg-white p-6 md:p-8">{children}</div>
      </main>
    </div>
  );
}
