"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode } from "react";
import { useAuth } from "@/lib/auth-context";

interface DashboardShellProps {
  children: ReactNode;
  tenantName?: string;
}

export function DashboardShell({ children, tenantName }: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-50">
      <aside className="hidden w-64 border-r border-zinc-800 bg-zinc-950/80 px-4 py-6 md:flex md:flex-col">
        <div className="mb-6">
          <button
            className="flex items-center gap-2 text-left"
            type="button"
            onClick={() => router.push("/tenants")}
          >
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 text-sm font-bold text-zinc-900">
              R
            </span>
            <div>
              <p className="text-sm font-semibold leading-tight">
                Restaurantes AI
              </p>
              <p className="text-xs text-zinc-400">Panel SaaS</p>
            </div>
          </button>
        </div>

        {tenantName && (
          <div className="mb-6 rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
            <p className="text-xs text-zinc-400">Restaurante activo</p>
            <p className="mt-1 text-sm font-medium">{tenantName}</p>
          </div>
        )}

        <nav className="space-y-1 text-sm">
          <p className="mb-1 px-2 text-xs font-medium uppercase text-zinc-500">
            Superadmin
          </p>
          <NavItem href="/tenants" label="Restaurantes" active={isActive("/tenants")} />
        </nav>

        {tenantName && (
          <nav className="mt-6 space-y-1 text-sm">
            <p className="mb-1 px-2 text-xs font-medium uppercase text-zinc-500">
              Restaurante
            </p>
            <NavItem
              href={pathname.split("/").slice(0, 3).join("/") + "/inbox"}
              label="Inbox"
              active={pathname.includes("/inbox")}
            />
            <NavItem
              href={pathname.split("/").slice(0, 3).join("/") + "/knowledge"}
              label="Conocimiento"
              active={pathname.includes("/knowledge")}
            />
            <NavItem
              href={pathname.split("/").slice(0, 3).join("/") + "/prompts"}
              label="Prompts"
              active={pathname.includes("/prompts")}
            />
            <NavItem
              href={pathname.split("/").slice(0, 3).join("/") + "/settings/ycloud"}
              label="YCloud"
              active={pathname.includes("/settings/ycloud")}
            />
            <NavItem
              href={pathname.split("/").slice(0, 3).join("/") + "/users"}
              label="Usuarios & roles"
              active={pathname.includes("/users")}
            />
          </nav>
        )}

        <div className="mt-auto pt-6 text-xs text-zinc-500">
          <p>Demo conectada a backend beemo-ai.</p>
        </div>
      </aside>

      <main className="flex-1">
        <header className="flex items-center justify-between border-b border-zinc-800 bg-zinc-950/80 px-4 py-3">
          <div className="flex flex-col">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Panel SaaS
            </p>
            <p className="text-sm text-zinc-300">
              Superadmin y restaurantes con integraciones YCloud.
            </p>
          </div>
          <button
            type="button"
            className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:border-zinc-500"
            onClick={() => {
              logout();
              router.push("/login");
            }}
          >
            Cerrar sesión{user?.email ? ` · ${user.email}` : ""}
          </button>
        </header>

        <div className="px-4 py-4 md:px-6 md:py-6">{children}</div>
      </main>
    </div>
  );
}

interface NavItemProps {
  href: string;
  label: string;
  active: boolean;
}

function NavItem({ href, label, active }: NavItemProps) {
  return (
    <Link
      href={href}
      className={`flex items-center rounded-md px-2 py-1.5 text-sm transition ${
        active
          ? "bg-zinc-800 text-zinc-50"
          : "text-zinc-300 hover:bg-zinc-900 hover:text-zinc-50"
      }`}
    >
      {label}
    </Link>
  );
}

