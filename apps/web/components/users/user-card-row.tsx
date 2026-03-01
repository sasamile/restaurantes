"use client";

import * as React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { Id } from "@/convex";
import { MoreHorizontal, UserMinus, Mail, Shield } from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  AGENT: "Operador",
  VIEWER: "Solo lectura",
};

function getInitials(name: string | null | undefined): string {
  if (!name?.trim()) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function formatRelativeTime(ms: number): string {
  const sec = Math.floor((Date.now() - ms) / 1000);
  if (sec < 60) return "Activo ahora";
  if (sec < 3600) return `Activo hace ${Math.floor(sec / 60)}m`;
  if (sec < 86400) return `Activo hace ${Math.floor(sec / 3600)}h`;
  if (sec < 604800) return `Hace ${Math.floor(sec / 86400)}d`;
  return `Hace ${Math.floor(sec / 604800)} sem`;
}

interface Member {
  _id: Id<"userTenants">;
  userId: Id<"users">;
  tenantId: Id<"tenants">;
  role: string;
  createdAt: number;
  user: { name: string; email: string } | null;
}

interface UserCardRowProps {
  member: Member;
  primaryColor: string;
  status?: "active" | "pending" | "disabled";
  onChangeRole: (member: Member) => void;
  onRemoveAccess: (member: Member) => void;
  onResendInvite?: (member: Member) => void;
  onViewPermissions?: (member: Member) => void;
}

export function UserCardRow({
  member,
  primaryColor,
  status = "active",
  onRemoveAccess,
  onResendInvite,
  onViewPermissions,
  onChangeRole,
}: UserCardRowProps) {
  return (
    <div
      className={cn(
        "group flex items-center gap-4 rounded-xl border border-slate-200/80 bg-white px-5 py-4 transition-all duration-200",
        "hover:border-slate-300/80 hover:shadow-sm"
      )}
    >
      {/* Avatar + info */}
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <div className="relative shrink-0">
          <div
            className="flex size-11 items-center justify-center rounded-full text-sm font-semibold text-white"
            style={{
              background: `linear-gradient(135deg, ${primaryColor} 0%, color-mix(in srgb, ${primaryColor} 80%, white) 100%)`,
            }}
          >
            {getInitials(member.user?.name)}
          </div>
          {status === "active" && (
            <span
              className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-white bg-emerald-500"
              title="Activo"
            />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-900 truncate">
              {member.user?.name ?? "—"}
            </span>
            {member.role === "OWNER" && (
              <span
                className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide"
                style={{
                  backgroundColor: `${primaryColor}20`,
                  color: primaryColor,
                }}
              >
                Propietario
              </span>
            )}
            {status === "pending" && (
              <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">
                Pendiente
              </span>
            )}
            {status === "disabled" && (
              <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                Sin acceso
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-sm text-slate-500">
            {member.user?.email ?? "—"}
          </p>
        </div>
      </div>

      {/* Role badge */}
      <div className="shrink-0">
        <span
          className={cn(
            "inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
            member.role === "OWNER"
              ? "text-slate-700"
              : "bg-slate-100 text-slate-700"
          )}
        >
          {ROLE_LABELS[member.role] ?? member.role}
        </span>
      </div>

      {/* Last activity */}
      <div className="hidden sm:block w-28 shrink-0 text-right text-xs text-slate-500">
        {status === "active"
          ? formatRelativeTime(member.createdAt * 1000)
          : status === "pending"
            ? "Invitación enviada"
            : "—"}
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={() => onChangeRole(member)}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
        >
          Cambiar rol
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              aria-label="Más opciones"
            >
              <MoreHorizontal className="size-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              className="text-red-600 focus:text-red-600 cursor-pointer"
              onSelect={() => onRemoveAccess(member)}
            >
              <UserMinus className="size-4" />
              Quitar acceso
            </DropdownMenuItem>
            {onResendInvite && status === "pending" && (
              <DropdownMenuItem
                className="cursor-pointer"
                onSelect={() => onResendInvite(member)}
              >
                <Mail className="size-4" />
                Reenviar invitación
              </DropdownMenuItem>
            )}
            {onViewPermissions && (
              <DropdownMenuItem
                className="cursor-pointer"
                onSelect={() => onViewPermissions(member)}
              >
                <Shield className="size-4" />
                Ver permisos
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
