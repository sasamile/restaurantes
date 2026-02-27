"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex";
import type { Id } from "@/convex";
import { useState } from "react";

export default function PlanesPage() {
  const plans = useQuery(api.plans.list);
  const createPlan = useMutation(api.plans.create);
  const updatePlan = useMutation(api.plans.update);
  const removePlan = useMutation(api.plans.remove);

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<Id<"plans"> | null>(null);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    price: 0,
    maxRestaurantes: 1,
    maxUsuarios: 2,
  });

  const openCreate = () => {
    setEditingId(null);
    setForm({ name: "", slug: "", price: 0, maxRestaurantes: 1, maxUsuarios: 2 });
    setShowModal(true);
  };

  const openEdit = (p: NonNullable<typeof plans>[0]) => {
    setEditingId(p._id);
    setForm({
      name: p.name,
      slug: p.slug,
      price: p.price,
      maxRestaurantes: p.maxRestaurantes,
      maxUsuarios: p.maxUsuarios,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.slug.trim()) return;
    try {
      if (editingId) {
        await updatePlan({
          planId: editingId,
          name: form.name,
          slug: form.slug,
          price: form.price,
          maxRestaurantes: form.maxRestaurantes,
          maxUsuarios: form.maxUsuarios,
        });
      } else {
        await createPlan({
          name: form.name,
          slug: form.slug,
          price: form.price,
          maxRestaurantes: form.maxRestaurantes,
          maxUsuarios: form.maxUsuarios,
        });
      }
      setShowModal(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al guardar");
    }
  };

  const handleDelete = async (id: Id<"plans">) => {
    if (!confirm("¿Eliminar este plan?")) return;
    try {
      await removePlan({ planId: id });
      setShowModal(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al eliminar");
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Planes</h2>
          <p className="mt-1 text-sm text-slate-500">
            Configura los planes disponibles para los restaurantes.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-red-600/25 transition hover:bg-red-700"
        >
          + Crear plan
        </button>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {plans === undefined ? (
          <div className="col-span-full rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">
            Cargando...
          </div>
        ) : plans.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">
            No hay planes. Crea el primero o ejecuta <code className="rounded bg-slate-100 px-1">plans.seed</code> en el dashboard de Convex.
          </div>
        ) : (
          plans.map((plan) => (
            <div
              key={plan._id}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-red-200 hover:shadow-md"
            >
              <h3 className="text-lg font-semibold text-slate-800">{plan.name}</h3>
              <p className="mt-2">
                <span className="text-3xl font-bold text-red-600">${plan.price}</span>
                <span className="text-sm text-slate-500">/mes</span>
              </p>
              <ul className="mt-4 space-y-2 text-sm text-slate-600">
                <li>
                  Restaurantes: {plan.maxRestaurantes === -1 ? "Ilimitados" : plan.maxRestaurantes}
                </li>
                <li>
                  Usuarios: {plan.maxUsuarios === -1 ? "Ilimitados" : plan.maxUsuarios}
                </li>
              </ul>
              <div className="mt-6 flex gap-2">
                <button
                  type="button"
                  onClick={() => openEdit(plan)}
                  className="flex-1 rounded-xl border border-slate-300 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Editar plan
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(plan._id)}
                  className="rounded-xl border border-red-200 py-2.5 px-3 text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">
        <h3 className="font-semibold text-slate-800">Asignación de planes por restaurante</h3>
        <p className="mt-1 text-sm text-slate-500">
          En el detalle de cada restaurante (Restaurantes → selecciona uno → editar) podrás asignar o cambiar su plan.
        </p>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-800">
              {editingId ? "Editar plan" : "Crear plan"}
            </h3>
            <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="block text-sm font-medium text-slate-700">Nombre</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      name: e.target.value,
                      slug: form.slug || e.target.value.toLowerCase().replace(/\s+/g, "-"),
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                  placeholder="Pro"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Slug</label>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                  placeholder="pro"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Precio ($/mes)</label>
                <input
                  type="number"
                  min={0}
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: Number(e.target.value) || 0 })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Max restaurantes</label>
                  <input
                    type="number"
                    min={-1}
                    value={form.maxRestaurantes}
                    onChange={(e) => setForm({ ...form, maxRestaurantes: Number(e.target.value) || 0 })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                    title="-1 = ilimitado"
                  />
                  <p className="mt-0.5 text-xs text-slate-500">-1 = ilimitado</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Max usuarios</label>
                  <input
                    type="number"
                    min={-1}
                    value={form.maxUsuarios}
                    onChange={(e) => setForm({ ...form, maxUsuarios: Number(e.target.value) || 0 })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                  />
                  <p className="mt-0.5 text-xs text-slate-500">-1 = ilimitado</p>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-red-700"
                >
                  {editingId ? "Guardar" : "Crear"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
