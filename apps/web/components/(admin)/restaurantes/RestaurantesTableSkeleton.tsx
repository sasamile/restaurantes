"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function RestaurantesTableSkeleton() {
  return (
    <div className="overflow-hidden rounded-[20px] bg-white shadow-[0_4px_12px_rgba(0,0,0,0.04)]">
      <div className="flex flex-wrap items-center gap-3 border-b border-[#E2E8F0] bg-[#F8FAFC] px-6 py-4">
        <Skeleton className="h-10 min-w-[200px] flex-1 rounded-lg" />
        <Skeleton className="h-10 w-36 rounded-lg" />
        <Skeleton className="h-10 w-32 rounded-lg" />
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="hidden lg:block">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
              <th className="px-6 py-4 text-left text-[12px] font-medium uppercase tracking-wider text-[#64748B]">
                Restaurante
              </th>
              <th className="px-6 py-4 text-left text-[12px] font-medium uppercase tracking-wider text-[#64748B]">
                Plan
              </th>
              <th className="px-6 py-4 text-left text-[12px] font-medium uppercase tracking-wider text-[#64748B]">
                Estado
              </th>
              <th className="px-6 py-4 text-left text-[12px] font-medium uppercase tracking-wider text-[#64748B]">
                Colores
              </th>
              <th className="px-6 py-4 text-right text-[12px] font-medium uppercase tracking-wider text-[#64748B]">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <tr
                key={i}
                className="h-16 border-b border-[#E2E8F0] last:border-0"
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-3 w-3 shrink-0 rounded-full" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                </td>
                <td className="px-6 py-4">
                  <Skeleton className="h-6 w-20 rounded-full" />
                </td>
                <td className="px-6 py-4">
                  <Skeleton className="h-6 w-16 rounded-full" />
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <Skeleton className="h-6 w-6 rounded-full" />
                    <Skeleton className="h-6 w-6 rounded-full" />
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-1">
                    <Skeleton className="h-9 w-9 rounded-full" />
                    <Skeleton className="h-9 w-9 rounded-full" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="lg:hidden">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="flex flex-col gap-3 border-b border-[#E2E8F0] p-4 last:border-0"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="h-3 w-3 shrink-0 rounded-full" />
                <Skeleton className="h-4 w-28" />
              </div>
              <div className="flex gap-1">
                <Skeleton className="h-9 w-9 rounded-full" />
                <Skeleton className="h-9 w-9 rounded-full" />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-6 w-6 rounded-full" />
              <Skeleton className="h-6 w-6 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
