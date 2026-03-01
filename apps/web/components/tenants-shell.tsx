"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useTenant } from "@/lib/tenant-context";
import { useQuery } from "convex/react";
import { api } from "@/convex";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TenantsShellProps {
  children: ReactNode;
}

const DEFAULT_PRIMARY = "#197fe6";
const DEFAULT_SECONDARY = "#06b6d4";

interface NavEntry {
  href: string;
  icon: string;
  label: string;
  group: string;
  disabled?: boolean;
  disabledTitle?: string;
}

export function TenantsShell({ children }: TenantsShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { tenantId } = useTenant();
  const [collapsed, setCollapsed] = useState(false);

  const tenant = useQuery(
    api.tenants.get,
    tenantId ? { tenantId } : "skip"
  );
  const ycloud = useQuery(
    api.integrations.getYCloud,
    tenantId ? { tenantId } : "skip"
  );
  const needingAttention = useQuery(
    api.conversations.countNeedingAttention,
    tenantId && ycloud?.connected ? { tenantId } : "skip"
  );

  const baseHref = "/tenants";
  const ycloudConnected = ycloud?.connected ?? false;
  const primaryColor = tenant?.primaryColor ?? DEFAULT_PRIMARY;
  const secondaryColor = tenant?.secondaryColor ?? DEFAULT_SECONDARY;

  const cssVars = useMemo(
    () =>
      ({
        "--primaryColor": primaryColor,
        "--primaryLight": `color-mix(in srgb, ${primaryColor} 25%, white)`,
        "--primarySoft": `color-mix(in srgb, ${primaryColor} 12%, white)`,
        "--secondaryColor": secondaryColor,
        "--secondaryLight": `color-mix(in srgb, ${secondaryColor} 25%, white)`,
        "--secondarySoft": `color-mix(in srgb, ${secondaryColor} 12%, white)`,
      } as React.CSSProperties),
    [primaryColor, secondaryColor]
  );

  const isActive = (href: string) =>
    pathname === href || (href !== "/tenants" && pathname.startsWith(href));

  const navEntries: NavEntry[] = [
    { href: "/tenants", icon: "dashboard", label: "Dashboard", group: "General" },
    {
      href: `${baseHref}/inbox`,
      icon: "mail",
      label: "Inbox",
      group: "General",
      disabled: !tenantId || !ycloudConnected,
      disabledTitle: "Conecta YCloud en Integraciones",
    },
    {
      href: `${baseHref}/knowledge`,
      icon: "menu_book",
      label: "Conocimiento",
      group: "Conocimiento",
    },
    {
      href: `${baseHref}/reservas`,
      icon: "event",
      label: "Reservas",
      group: "General",
    },
    {
      href: `${baseHref}/solicitudes`,
      icon: "local_shipping",
      label: "Pedidos",
      group: "General",
    },
    {
      href: `${baseHref}/pqrs`,
      icon: "support_agent",
      label: "PQRs",
      group: "General",
    },
    {
      href: `${baseHref}/integraciones`,
      icon: "link",
      label: "Integraciones",
      group: "Integraciones",
    },
    { href: `${baseHref}/users`, icon: "group", label: "Usuarios", group: "Usuarios" },
  ].filter((e) => tenantId || e.group === "General");

  const groups = [...new Set(navEntries.map((e) => e.group))];

  return (
    <div
      className="flex h-screen overflow-hidden bg-linear-to-br from-slate-100 via-slate-50 to-slate-100 text-slate-800 font-(--font-inter)"
      style={cssVars}
    >
      {/* Sidebar flotante - único, con transición de ancho */}
      <aside
        className={`
          shrink-0 flex flex-col bg-white rounded-2xl shadow-lg border border-slate-200/60 overflow-hidden
          transition-all duration-300 ease-out m-3
          ${collapsed ? "w-[72px]" : "w-[240px]"}
        `}
        style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}
      >
        {/* Top: Logo + nombre del restaurante (configurados por Super Admin) */}
        <div className="flex items-center gap-3 p-4 shrink-0 border-b border-slate-100">
          <Link
            href="/tenants"
            className="size-11 rounded-xl flex items-center justify-center shrink-0 overflow-hidden transition-transform duration-150 hover:scale-105 active:scale-95 bg-slate-100"
            style={{
              backgroundColor: tenant?.logoUrl ? "transparent" : "var(--primaryColor)",
            }}
          >
            {tenant?.logoUrl ? (
              <img
                src={tenant.logoUrl}
                alt={tenant?.name ?? "Logo"}
                className="size-full object-contain p-1 rounded-xl"
              />
            ) : (
              <span className="material-symbols-outlined text-2xl text-white">restaurant</span>
            )}
          </Link>
          {!collapsed && (
            <div className="flex-1 min-w-0 animate-in fade-in slide-in-from-left-2 duration-200">
              <h1 className="text-sm uppercase font-semibold text-slate-800 truncate">
                {tenant?.name ?? "Selecciona un restaurante"}
              </h1>
            
            </div>
          )}
        </div>

        {/* Middle: Navegación - iconos siempre, texto solo si expandido */}
        <nav className="flex-1 overflow-y-auto py-4 min-h-0 px-3">
          {collapsed ? (
            <div className="flex flex-col gap-0.5 items-center">
              {navEntries.map((entry) => {
                const active = !entry.disabled && isActive(entry.href);
                const showBadge = !entry.disabled && entry.href.includes("/inbox") && (needingAttention ?? 0) > 0;
                const iconBtn = (
                  <span
                    title={entry.disabled ? entry.disabledTitle : entry.label}
                    className={`
                      relative size-10 rounded-xl flex items-center justify-center transition-all duration-150
                      ${entry.disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-slate-100 hover:-translate-y-0.5 active:scale-95"}
                      ${active ? "bg-(--primarySoft) text-(--primaryColor)" : "text-slate-500"}
                    `}
                  >
                    <span className="material-symbols-outlined text-[22px]">
                      {entry.icon}
                    </span>
                    {showBadge && (
                      <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center">
                        {needingAttention}
                      </span>
                    )}
                  </span>
                );
                return entry.disabled ? (
                  <span key={entry.label}>{iconBtn}</span>
                ) : (
                  <Link key={entry.label} href={entry.href} className="flex justify-center">
                    {iconBtn}
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {groups.map((group) => (
                <div key={group}>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2 px-2">
                    {group}
                  </p>
                  <div className="flex flex-col gap-0.5">
                    {navEntries
                      .filter((e) => e.group === group)
                      .map((entry) => {
                        const active = !entry.disabled && isActive(entry.href);
                        const content = (
                          <span
                            className={`
                              flex items-center gap-3 py-2.5 px-3 rounded-xl transition-all duration-150
                              active:scale-[0.98]
                              ${active ? "text-(--primaryColor)" : "text-slate-600"}
                              ${entry.disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:bg-slate-50 hover:-translate-y-0.5"}
                            `}
                            style={
                              active
                                ? {
                                    background: `color-mix(in srgb, var(--primaryColor) 12%, white)`,
                                    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                                  }
                                : undefined
                            }
                          >
                            <span
                              className={`material-symbols-outlined text-[22px] shrink-0 ${active ? "text-(--primaryColor)" : ""}`}
                            >
                              {entry.icon}
                            </span>
                            <span className="text-sm font-medium truncate">{entry.label}</span>
                            {!entry.disabled && entry.href.includes("/inbox") && (needingAttention ?? 0) > 0 && (
                              <span className="ml-auto min-w-[18px] h-[18px] rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                                {needingAttention}
                              </span>
                            )}
                            {entry.disabled && (
                              <span className="ml-auto text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded shrink-0">
                                Off
                              </span>
                            )}
                          </span>
                        );
                        return entry.disabled ? (
                          <span key={entry.label} title={entry.disabledTitle}>
                            {content}
                          </span>
                        ) : (
                          <Link key={entry.label} href={entry.href}>
                            {content}
                          </Link>
                        );
                      })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </nav>

        {/* Bottom: Botón colapsar + Dropdown usuario (siempre) */}
        <div className="p-3 shrink-0 border-t border-slate-100 flex flex-col gap-2">
          {/* Toggle colapsar */}
          <button
            type="button"
            onClick={() => setCollapsed((x) => !x)}
            className={`
              flex items-center justify-center gap-2 rounded-xl py-2.5 transition-all duration-150
              text-slate-400 hover:bg-slate-100 hover:text-(--primaryColor) active:scale-95
              ${collapsed ? "w-full" : "w-full"}
            `}
            title={collapsed ? "Expandir menú" : "Colapsar menú"}
          >
            <span
              className={`material-symbols-outlined text-xl transition-transform duration-200 ${collapsed ? "rotate-180" : ""}`}
            >
              chevron_left
            </span>
            {!collapsed && (
              <span className="text-xs font-medium animate-in fade-in duration-200">
                Colapsar
              </span>
            )}
          </button>

          {/* Dropdown usuario: avatar + Chat, Cerrar sesión */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={`
                  flex items-center gap-3 w-full rounded-xl p-3 transition-all duration-150
                  hover:bg-slate-50 active:scale-[0.98]
                  ${collapsed ? "justify-center" : ""}
                `}
              >
                <div
                  className="size-10 rounded-full flex items-center justify-center text-white shrink-0 overflow-hidden"
                  style={{
                    background: `linear-gradient(135deg, var(--primaryColor) 0%, var(--primaryLight) 100%)`,
                  }}
                >
                  <span className="material-symbols-outlined text-xl text-white">person</span>
                </div>
                {!collapsed && (
                  <div className="flex-1 text-left min-w-0 animate-in fade-in duration-200">
                    <p className="text-sm font-semibold text-slate-800 truncate">
                      {user?.name ?? "Usuario"}
                    </p>
                    <p className="text-xs text-slate-500 truncate">{user?.email ?? ""}</p>
                  </div>
                )}
                {!collapsed && (
                  <span className="material-symbols-outlined text-slate-400 text-lg shrink-0">
                    expand_more
                  </span>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <p className="font-semibold">{user?.name ?? "Usuario"}</p>
                <p className="text-xs font-normal text-slate-500">{user?.email ?? ""}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href={tenantId ? `${baseHref}/ajustes` : baseHref} className="cursor-pointer">
                  <span className="material-symbols-outlined text-lg mr-2">settings</span>
                  Ajustes
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600 focus:text-red-600 cursor-pointer"
                onSelect={() => {
                  logout();
                  router.push("/login");
                }}
              >
                <span className="material-symbols-outlined text-lg mr-2">logout</span>
                Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main - área de contenido */}
      <main className="flex-1 m-3 flex flex-col overflow-hidden min-w-0">
   

        <div className="flex flex-1 min-h-0 flex-col overflow-hidden bg-white rounded-2xl">
          {children}
        </div>
      </main>
    </div>
  );
}
