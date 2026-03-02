"use client";

import * as React from "react";
import { Suspense } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { useRequireModule } from "@/lib/use-require-module";
import { api } from "@/convex";
import type { Id } from "@/convex";
import { useTenant } from "@/lib/tenant-context";
import { useSearchParams } from "next/navigation";
import { ReservasHeader, type ViewMode } from "@/components/reservas/reservas-header";
import { ReservasTabs, type FilterTab } from "@/components/reservas/reservas-tabs";
import { CalendarGrid } from "@/components/reservas/calendar-grid";
import { ReservasListView } from "@/components/reservas/reservas-list-view";
import { ReservationDialog } from "@/components/reservas/reservation-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const DEFAULT_PRIMARY = "#197fe6";
const DEFAULT_SECONDARY = "#06b6d4";

function getDayStart(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

function getWeekStart(d: Date) {
  const x = new Date(d);
  const day = x.getDay();
  const diff = x.getDate() - day + (day === 0 ? -6 : 1);
  x.setDate(diff);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

type Reservation = {
  _id: Id<"reservations">;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  startTime: number;
  endTime: number;
  tableNumber?: string;
  status: "confirmed" | "pending" | "cancelled" | "completed" | "no_show";
  source?: string;
  extraData?: string;
  googleEventId?: string;
};

function ReservasContent() {
  useRequireModule("reservas");
  const { tenantId } = useTenant();
  const searchParams = useSearchParams();
  const googleStatus = searchParams?.get("google");
  const [showGoogleBanner, setShowGoogleBanner] = React.useState(!!googleStatus);
  const [currentDate, setCurrentDate] = React.useState(() => new Date());
  const [viewMode, setViewMode] = React.useState<ViewMode>("day");
  const [filterTab, setFilterTab] = React.useState<FilterTab>("todas");
  const [selectedReservation, setSelectedReservation] = React.useState<Reservation | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [newReservationOpen, setNewReservationOpen] = React.useState(false);
  const [newReservationForm, setNewReservationForm] = React.useState({
    date: "",
    time: "19:00",
    durationMinutes: 120,
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    tableNumber: "",
  });
  const [creating, setCreating] = React.useState(false);
  const [importing, setImporting] = React.useState(false);

  const dayStart = getDayStart(currentDate);
  const weekStart = getWeekStart(currentDate);
  const weekEnd = weekStart + 7 * 24 * 60 * 60 * 1000 - 1;

  const tenant = useQuery(api.tenants.get, tenantId ? { tenantId } : "skip");
  const allReservations = useQuery(
    api.reservations.listByDateRange,
    tenantId
      ? {
          tenantId,
          startTime: viewMode === "week" ? weekStart : dayStart,
          endTime: viewMode === "week" ? weekEnd : dayStart + 24 * 60 * 60 * 1000 - 1,
          includeCancelled: true,
        }
      : "skip"
  );
  const googleCalendar = useQuery(
    api.googleCalendar.get,
    tenantId ? { tenantId } : "skip"
  );
  const config = useQuery(
    api.reservationConfig.getOrDefault,
    tenantId ? { tenantId } : "skip"
  );

  const createReservation = useMutation(api.reservations.create);
  const confirmArrival = useMutation(api.reservations.confirmArrival);
  const markNoShow = useMutation(api.reservations.markNoShow);
  const cancelReservation = useMutation(api.reservations.cancel);
  const deleteReservation = useMutation(api.reservations.deleteReservation);
  const freeTable = useMutation(api.reservations.freeTable);
  const importFromGoogle = useAction(api.googleCalendarImport.importFromGoogle);

  const primaryColor = tenant?.primaryColor ?? DEFAULT_PRIMARY;
  const secondaryColor = tenant?.secondaryColor ?? DEFAULT_SECONDARY;

  const todayStart = getDayStart(new Date());
  const todayEnd = todayStart + 24 * 60 * 60 * 1000 - 1;

  const counts = React.useMemo(() => {
    const rows = allReservations ?? [];
    const todayRows = rows.filter((r) => r.startTime >= todayStart && r.startTime <= todayEnd);
    return {
      todas: rows.length,
      hoy: todayRows.length,
      confirmadas: rows.filter((r) => r.status === "confirmed" || r.status === "completed").length,
      pendientes: rows.filter((r) => r.status === "pending").length,
      no_show: rows.filter((r) => r.status === "no_show").length,
      canceladas: rows.filter((r) => r.status === "cancelled").length,
    };
  }, [allReservations, todayStart, todayEnd]);

  const filteredReservations = React.useMemo(() => {
    const rows = allReservations ?? [];
    switch (filterTab) {
      case "todas":
        return rows;
      case "hoy":
        return rows.filter((r) => r.startTime >= todayStart && r.startTime <= todayEnd);
      case "confirmadas":
        return rows.filter((r) => r.status === "confirmed" || r.status === "completed");
      case "pendientes":
        return rows.filter((r) => r.status === "pending");
      case "no_show":
        return rows.filter((r) => r.status === "no_show");
      case "canceladas":
        return rows.filter((r) => r.status === "cancelled");
      default:
        return rows;
    }
  }, [allReservations, filterTab, todayStart, todayEnd]);

  React.useEffect(() => {
    if (googleStatus === "connected" && showGoogleBanner) {
      const t = setTimeout(() => setShowGoogleBanner(false), 4000);
      return () => clearTimeout(t);
    }
  }, [googleStatus, showGoogleBanner]);

  const handleNewReservation = () => {
    const d = new Date(currentDate);
    setNewReservationForm({
      date: d.toISOString().slice(0, 10),
      time: "19:00",
      durationMinutes: config?.defaultDurationMinutes ?? 120,
      customerName: "",
      customerPhone: "",
      customerEmail: "",
      tableNumber: "",
    });
    setNewReservationOpen(true);
  };

  const handleCreateReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId) return;
    const { date, time, durationMinutes, customerName, customerPhone, customerEmail, tableNumber } =
      newReservationForm;
    if (!date || !time || !customerName.trim()) return;
    const [year, month, day] = date.split("-").map(Number);
    const [hours, minutes] = time.split(":").map(Number);
    const startDate = new Date(year, month - 1, day, hours, minutes || 0, 0);
    const endDate = new Date(startDate.getTime() + (durationMinutes || 120) * 60 * 1000);
    setCreating(true);
    try {
      await createReservation({
        tenantId,
        startTime: startDate.getTime(),
        endTime: endDate.getTime(),
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim() || undefined,
        customerEmail: customerEmail.trim() || undefined,
        tableNumber: tableNumber.trim() || undefined,
        source: "presencial",
      });
      setNewReservationOpen(false);
      setDialogOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo crear la reserva.";
      alert(message);
    } finally {
      setCreating(false);
    }
  };

  const handleImportFromGoogle = async () => {
    if (!tenantId) return;
    setImporting(true);
    try {
      const res = await importFromGoogle({
        tenantId,
        timeMin: viewMode === "week" ? weekStart : dayStart,
        timeMax: (viewMode === "week" ? weekEnd : dayStart + 24 * 60 * 60 * 1000) + 7 * 24 * 60 * 60 * 1000,
      });
      if (res.error) alert(res.error);
    } finally {
      setImporting(false);
    }
  };

  const handleReservationClick = (r: Reservation) => {
    setSelectedReservation(r);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setSelectedReservation(null);
  };

  const runAction = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
      closeDialog();
    } catch (e) {
      console.error(e);
    }
  };

  if (!tenantId) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-slate-500">Cargando...</p>
      </div>
    );
  }

  return (
    <div
      className="min-h-full overflow-y-auto bg-[#f8fafc] p-6 sm:p-8"
      style={
        {
          "--primaryColor": primaryColor,
          "--secondaryColor": secondaryColor,
        } as React.CSSProperties
      }
    >
      <div className="mx-auto max-w-[1600px] space-y-6">
        {showGoogleBanner && googleStatus === "connected" && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Google Calendar conectado. Las reservas se sincronizarán automáticamente.
          </div>
        )}

        <ReservasHeader
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onNewReservation={handleNewReservation}
          primaryColor={primaryColor}
          googleConnected={googleCalendar?.connected ?? false}
          onImportFromGoogle={handleImportFromGoogle}
          importing={importing}
          currentDate={currentDate}
          onPrev={() => {
            const d = new Date(currentDate);
            if (viewMode === "day") d.setDate(d.getDate() - 1);
            else d.setDate(d.getDate() - 7);
            setCurrentDate(d);
          }}
          onNext={() => {
            const d = new Date(currentDate);
            if (viewMode === "day") d.setDate(d.getDate() + 1);
            else d.setDate(d.getDate() + 7);
            setCurrentDate(d);
          }}
          onGoToday={() => setCurrentDate(new Date())}
        />

        <ReservasTabs
          activeTab={filterTab}
          onTabChange={setFilterTab}
          counts={counts}
          primaryColor={primaryColor}
        />

        {viewMode === "list" ? (
          <ReservasListView
            reservations={filteredReservations}
            onReservationClick={handleReservationClick}
            primaryColor={primaryColor}
          />
        ) : (
          <CalendarGrid
            viewMode={viewMode}
            dayStart={viewMode === "day" ? dayStart : weekStart}
            reservations={filteredReservations}
            onReservationClick={handleReservationClick}
            primaryColor={primaryColor}
          />
        )}
      </div>

      {/* Dialog detalle reserva */}
      {selectedReservation && (
        <ReservationDialog
          reservation={selectedReservation}
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) setSelectedReservation(null);
          }}
          primaryColor={primaryColor}
          onConfirm={(id) =>
            runAction(() => confirmArrival({ reservationId: id }))
          }
          onCancel={(id) =>
            runAction(() => cancelReservation({ reservationId: id }))
          }
          onMarkNoShow={(id) =>
            runAction(() => markNoShow({ reservationId: id }))
          }
          onFreeTable={(id) =>
            runAction(() => freeTable({ reservationId: id }))
          }
          onDelete={(id) =>
            runAction(() => deleteReservation({ reservationId: id }))
          }
        />
      )}

      {/* Modal nueva reserva */}
      <Dialog open={newReservationOpen} onOpenChange={setNewReservationOpen}>
        <DialogContent className="max-w-md border-slate-200 bg-white">
          <DialogHeader>
            <DialogTitle className="text-slate-900">Nueva reserva</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateReservation} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Fecha</label>
                <input
                  type="date"
                  required
                  value={newReservationForm.date}
                  onChange={(e) => setNewReservationForm((f) => ({ ...f, date: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-900/5"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Hora</label>
                <input
                  type="time"
                  required
                  value={newReservationForm.time}
                  onChange={(e) => setNewReservationForm((f) => ({ ...f, time: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-900/5"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Duración (min)</label>
              <input
                type="number"
                min={30}
                max={480}
                value={newReservationForm.durationMinutes}
                onChange={(e) =>
                  setNewReservationForm((f) => ({
                    ...f,
                    durationMinutes: parseInt(e.target.value, 10) || 120,
                  }))
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-900/5"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Nombre *</label>
              <input
                type="text"
                required
                value={newReservationForm.customerName}
                onChange={(e) => setNewReservationForm((f) => ({ ...f, customerName: e.target.value }))}
                placeholder="Ej. Juan Pérez"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 ring-1 ring-slate-900/5"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Teléfono</label>
              <input
                type="tel"
                value={newReservationForm.customerPhone}
                onChange={(e) => setNewReservationForm((f) => ({ ...f, customerPhone: e.target.value }))}
                placeholder="+34 612 345 678"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 ring-1 ring-slate-900/5"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Mesa</label>
              <input
                type="text"
                value={newReservationForm.tableNumber}
                onChange={(e) => setNewReservationForm((f) => ({ ...f, tableNumber: e.target.value }))}
                placeholder="Ej. 3"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 ring-1 ring-slate-900/5"
              />
            </div>
            <DialogFooter className="gap-2 pt-4">
              <button
                type="button"
                onClick={() => setNewReservationOpen(false)}
                className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={creating}
                className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm disabled:opacity-50"
                style={{ backgroundColor: primaryColor }}
              >
                {creating ? "Creando…" : "Crear reserva"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ReservasPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center">
          <p className="text-slate-500">Cargando Reservas…</p>
        </div>
      }
    >
      <ReservasContent />
    </Suspense>
  );
}
