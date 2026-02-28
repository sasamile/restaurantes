"use client";

import { EmptyState } from "@/components/(admin)/restaurantes/EmptyState";
import { RestauranteDeleteAlert } from "@/components/(admin)/restaurantes/RestauranteDeleteAlert";
import { RestauranteFormDialog } from "@/components/(admin)/restaurantes/RestauranteFormDialog";
import { RestaurantesHeader } from "@/components/(admin)/restaurantes/RestaurantesHeader";
import { RestaurantesMetricCards } from "@/components/(admin)/restaurantes/RestaurantesMetricCards";
import { RestaurantesMetricCardsSkeleton } from "@/components/(admin)/restaurantes/RestaurantesMetricCardsSkeleton";
import { RestaurantesTable } from "@/components/(admin)/restaurantes/RestaurantesTable";
import { RestaurantesTableSkeleton } from "@/components/(admin)/restaurantes/RestaurantesTableSkeleton";
import { RestaurantesTableToolbar } from "@/components/(admin)/restaurantes/RestaurantesTableToolbar";
import { useRestaurantesPage } from "@/hook/use-restaurantes-page";



export default function RestaurantesPage() {
  const {
    tenants,
    plans,
    filteredTenants,
    stats,
    searchQuery,
    setSearchQuery,
    filterStatus,
    setFilterStatus,
    filterPlanId,
    setFilterPlanId,
    form,
    setForm,
    showModal,
    setShowModal,
    editingId,
    deleteTargetId,
    openCreate,
    openEdit,
    setDeleteTargetId,
    handleSubmit,
    handleDelete,
  } = useRestaurantesPage();

  const isLoading = tenants === undefined;
  const isEmpty = tenants !== undefined && tenants.length === 0;
  const hasActiveFilters =
    !!searchQuery.trim() || !!filterStatus || !!filterPlanId;

  return (
    <div
      className="mx-auto w-full max-w-[1280px] rounded-3xl px-8 py-10 sm:px-10 md:px-12"
      style={{ backgroundColor: "#F8FAFC" }}
    >
      <RestaurantesHeader onCreateClick={openCreate} />

      {isLoading ? (
        <>
          <RestaurantesMetricCardsSkeleton />
          <RestaurantesTableSkeleton />
        </>
      ) : isEmpty ? (
        <EmptyState onCreateClick={openCreate} />
      ) : (
        <>
          <RestaurantesMetricCards stats={stats} />
          <div className="overflow-hidden rounded-[20px] bg-white shadow-[0_4px_12px_rgba(0,0,0,0.04)]">
            <RestaurantesTableToolbar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              filterStatus={filterStatus}
              onStatusChange={setFilterStatus}
              filterPlanId={filterPlanId}
              onPlanChange={setFilterPlanId}
              plans={plans}
              count={filteredTenants.length}
            />
            <RestaurantesTable
              tenants={filteredTenants}
              onEdit={openEdit}
              onDeleteClick={setDeleteTargetId}
              hasActiveFilters={hasActiveFilters}
            />
          </div>
        </>
      )}

      <RestauranteFormDialog
        open={showModal}
        onOpenChange={setShowModal}
        form={form}
        setForm={setForm}
        editingId={editingId}
        plans={plans}
        onSubmit={handleSubmit}
      />

      <RestauranteDeleteAlert
        open={!!deleteTargetId}
        onOpenChange={(open) => !open && setDeleteTargetId(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
