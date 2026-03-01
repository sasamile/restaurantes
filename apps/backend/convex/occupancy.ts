import { query } from "./_generated/server";
import { v } from "convex/values";

/** Métricas de ocupación para el Centro de Control */
export const getMetrics = query({
  args: {
    tenantId: v.id("tenants"),
    dayStart: v.number(), // inicio del día 00:00
  },
  handler: async (ctx, args) => {
    const dayEnd = args.dayStart + 24 * 60 * 60 * 1000;
    const yesterdayStart = args.dayStart - 24 * 60 * 60 * 1000;
    const yesterdayEnd = args.dayStart;

    const reservationsToday = await ctx.db
      .query("reservations")
      .withIndex("by_tenant_date", (q) =>
        q.eq("tenantId", args.tenantId).gte("startTime", args.dayStart).lt("startTime", dayEnd)
      )
      .collect();
    const reservationsYesterday = await ctx.db
      .query("reservations")
      .withIndex("by_tenant_date", (q) =>
        q.eq("tenantId", args.tenantId).gte("startTime", yesterdayStart).lt("startTime", yesterdayEnd)
      )
      .collect();

    const now = Date.now();
    const active = reservationsToday.filter(
      (r) =>
        r.status !== "cancelled" &&
        r.status !== "no_show" &&
        r.confirmedAt &&
        now >= r.startTime &&
        now < r.endTime
    );
    const noShows = reservationsToday.filter((r) => r.status === "no_show");
    const totalReservations = reservationsToday.filter((r) => r.status !== "cancelled");
    const tables = await ctx.db
      .query("tables")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
    const totalTables = Math.max(tables.length || 1, 1);
    const occupiedNow = active.length;
    const available = totalTables - occupiedNow;
    const occupancyPct = Math.round((occupiedNow / totalTables) * 100);

    const completedWithDuration = reservationsToday.filter(
      (r) =>
        r.status === "completed" &&
        r.confirmedAt != null &&
        r.endTime > r.confirmedAt
    );
    const avgDuration =
      completedWithDuration.length > 0
        ? Math.round(
            completedWithDuration.reduce(
              (acc, r) => acc + (r.endTime - (r.confirmedAt as number)),
              0
            ) /
              completedWithDuration.length /
              60000
          )
        : 90;

    const noShowsYesterday = reservationsYesterday.filter((r) => r.status === "no_show").length;
    const changePct =
      reservationsYesterday.length > 0
        ? Math.round(
            ((totalReservations.length - reservationsYesterday.length) /
              reservationsYesterday.length) *
              100
          )
        : 0;

    return {
      occupiedNow,
      available,
      totalReservations: totalReservations.length,
      noShowsToday: noShows.length,
      occupancyPct,
      avgDurationMinutes: avgDuration,
      changePct,
      totalTables,
    };
  },
});

/** Conteo de reservas por día para heatmap semanal */
export const getWeekCounts = query({
  args: {
    tenantId: v.id("tenants"),
    weekStart: v.number(),
  },
  handler: async (ctx, args) => {
    const dayMs = 24 * 60 * 60 * 1000;
    const counts: { date: number; count: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const dayStart = args.weekStart + i * dayMs;
      const dayEnd = dayStart + dayMs;
      const rows = await ctx.db
        .query("reservations")
        .withIndex("by_tenant_date", (q) =>
          q.eq("tenantId", args.tenantId).gte("startTime", dayStart).lt("startTime", dayEnd)
        )
        .collect();
      counts.push({
        date: dayStart,
        count: rows.filter((r) => r.status !== "cancelled").length,
      });
    }
    return counts;
  },
});

/** Estado de cada mesa ahora (para mapa). Si no hay mesas configuradas, infiere de reservas. */
export const getTableStatus = query({
  args: {
    tenantId: v.id("tenants"),
    dayStart: v.number(),
  },
  handler: async (ctx, args) => {
    const dayEnd = args.dayStart + 24 * 60 * 60 * 1000;
    let tables = await ctx.db
      .query("tables")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
    const reservations = await ctx.db
      .query("reservations")
      .withIndex("by_tenant_date", (q) =>
        q.eq("tenantId", args.tenantId).gte("startTime", args.dayStart).lt("startTime", dayEnd)
      )
      .collect();
    const valid = reservations.filter((r) => r.status !== "cancelled");

    let tablesToUse = tables;
    if (tablesToUse.length === 0) {
      const tableNames = [...new Set(valid.map((r) => r.tableNumber).filter(Boolean))] as string[];
      if (tableNames.length === 0) tableNames.push("1", "2", "3", "4", "5", "6");
      const cols = Math.ceil(Math.sqrt(tableNames.length));
      tablesToUse = tableNames.map((name, i) => ({
        _id: `virtual-${name}` as (typeof tables)[0]["_id"],
        _creationTime: 0,
        tenantId: args.tenantId,
        name,
        positionX: 15 + (i % cols) * 25,
        positionY: 15 + Math.floor(i / cols) * 25,
        shape: "circle" as const,
        width: 12,
        height: 12,
        isActive: true,
        createdAt: 0,
        updatedAt: 0,
      })) as typeof tables;
    }

    const now = Date.now();
    const statusMap: Record<
      string,
      "available" | "reserved" | "occupied" | "no_show" | "inactive"
    > = {};
    for (const t of tablesToUse) {
      if (!t.isActive) {
        statusMap[t.name] = "inactive";
        continue;
      }
      const forTable = valid.filter((r) => r.tableNumber === t.name);
      const noShow = forTable.find((r) => r.status === "no_show");
      const occupied = forTable.find(
        (r) =>
          r.status === "confirmed" &&
          r.confirmedAt &&
          now >= r.startTime &&
          now < r.endTime
      );
      const reserved = forTable.find(
        (r) => r.status === "confirmed" && r.startTime > now
      );
      if (noShow && noShow.startTime <= now) statusMap[t.name] = "no_show";
      else if (occupied) statusMap[t.name] = "occupied";
      else if (reserved) statusMap[t.name] = "reserved";
      else statusMap[t.name] = "available";
    }

    const result = tablesToUse.map((t) => ({
      ...t,
      status: statusMap[t.name] ?? "available",
      currentReservation: valid.find(
        (r) =>
          r.tableNumber === t.name &&
          r.status === "confirmed" &&
          r.confirmedAt &&
          now >= r.startTime &&
          now < r.endTime
      ),
      nextReservation: valid
        .filter(
          (r) =>
            r.tableNumber === t.name &&
            r.status === "confirmed" &&
            r.startTime > now &&
            !r.confirmedAt
        )
        .sort((a, b) => a.startTime - b.startTime)[0],
    }));
    return result;
  },
});
