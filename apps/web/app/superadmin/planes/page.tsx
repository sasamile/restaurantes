"use client";

import { usePlanesPage } from "@/hook/use-planes-page";
import { PlansHeader } from "@/components/(admin)/planes/PlansHeader";
import { PlansMetrics } from "@/components/(admin)/planes/PlansMetrics";
import { BillingToggle } from "@/components/(admin)/planes/BillingToggle";
import { PlanCard } from "@/components/(admin)/planes/PlanCard";
import { PlanFormModal } from "@/components/(admin)/planes/PlanFormModal";
import { PlanDeleteAlert } from "@/components/(admin)/planes/PlanDeleteAlert";
import { AssignmentSection } from "@/components/(admin)/planes/AssignmentSection";

export default function PlanesPage() {
  const {
    plans,
    tenants,
    stats,
    showModal,
    setShowModal,
    editingId,
    deleteId,
    setDeleteId,
    billingPeriod,
    setBillingPeriod,
    form,
    setForm,
    openCreate,
    openEdit,
    handleSubmit,
    handleDelete,
    handleTenantPlanChange,
  } = usePlanesPage();

  return (
    <div className="min-h-0 flex-1 bg-[#F8FAFC]">
      <div className="mx-auto max-w-[1200px] px-4 py-10 sm:px-6 lg:px-8">
        <div className="space-y-10">
          <PlansHeader onCreate={openCreate} />

          <PlansMetrics stats={stats} />

          <div className="flex flex-wrap items-center justify-between gap-4">
            <BillingToggle value={billingPeriod} onChange={setBillingPeriod} />
          </div>

          <section>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {plans === undefined ? (
                <div className="col-span-full rounded-[24px] border border-[#E2E8F0] bg-white p-12 text-center text-sm text-[#64748B] shadow-[0_8px_20px_rgba(0,0,0,0.05)]">
                  Cargando planes...
                </div>
              ) : plans.length === 0 ? (
                <div className="col-span-full rounded-[24px] border border-[#E2E8F0] bg-white p-12 text-center shadow-[0_8px_20px_rgba(0,0,0,0.05)]">
                  <p className="text-sm text-[#64748B]">
                    No hay planes. Crea el primero o ejecuta{" "}
                    <code className="rounded bg-[#F1F5F9] px-1.5 py-0.5 text-xs">
                      plans.seed
                    </code>{" "}
                    en el dashboard de Convex.
                  </p>
                  <button
                    type="button"
                    onClick={openCreate}
                    className="mt-4 inline-flex items-center gap-2 rounded-[14px] bg-[#EF4444] px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-[#DC2626]"
                  >
                    Crear plan
                  </button>
                </div>
              ) : (
                plans.map((plan) => (
                  <PlanCard
                    key={plan._id}
                    plan={plan}
                    billingPeriod={billingPeriod}
                    isPopular={plan.name?.toLowerCase().includes("pro")}
                    onEdit={() => openEdit(plan)}
                    onDelete={() => setDeleteId(plan._id)}
                  />
                ))
              )}
            </div>
          </section>

          <section>
            <AssignmentSection
              tenants={tenants ?? []}
              plans={plans ?? []}
              onPlanChange={handleTenantPlanChange}
            />
          </section>
        </div>
      </div>

      <PlanFormModal
        open={showModal}
        onOpenChange={setShowModal}
        editingId={editingId}
        form={form}
        setForm={setForm}
        onSubmit={handleSubmit}
      />

      <PlanDeleteAlert
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
