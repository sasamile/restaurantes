"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex";
import type { Id } from "@/convex";
import { useState, useEffect } from "react";

type Status = "active" | "trial" | "cancelled";

const STATUS_LABELS: Record<Status, string> = {
  active: "Activo",
  trial: "Prueba",
  cancelled: "Cancelado",
};

export default function RestaurantesPage() {
  const tenants = useQuery(api.tenants.listWithPlans);
  const plans = useQuery(api.plans.list);
  const createTenant = useMutation(api.tenants.create);
  const updateTenant = useMutation(api.tenants.update);
  const removeTenant = useMutation(api.tenants.remove);

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<Id<"tenants"> | null>(null);
  const [activeTab, setActiveTab] = useState<"general" | "administradores" | "prompt">("general");
  const [selectedTenantId, setSelectedTenantId] = useState<Id<"tenants"> | null>(null);

  const [form, setForm] = useState({
    name: "",
    slug: "",
    status: "active" as Status,
    planId: "" as Id<"plans"> | "",
    primaryColor: "#dc2626",
    secondaryColor: "#fef2f2",
    address: "",
    phone: "",
    defaultPrompt: "",
  });

  const createPrompt = useMutation(api.prompts.create);

  const selectedTenant = tenants?.find((t) => t._id === selectedTenantId);

  const openCreate = () => {
    setEditingId(null);
    setForm({
      name: "",
      slug: "",
      status: "active",
      planId: "",
      primaryColor: "#dc2626",
      secondaryColor: "#fef2f2",
      address: "",
      phone: "",
      defaultPrompt: "Eres el asistente virtual del restaurante. Responde en tono cercano y profesional. Prioriza reservas y resolución de dudas frecuentes sobre horario, menú y ubicación.",
    });
    setShowModal(true);
  };

  const openEdit = (t: NonNullable<typeof tenants>[0]) => {
    setEditingId(t._id);
    setForm({
      name: t.name,
      slug: t.slug,
      status: t.status,
      planId: t.planId ?? "",
      primaryColor: t.primaryColor ?? "#dc2626",
      secondaryColor: t.secondaryColor ?? "#fef2f2",
      address: t.address ?? "",
      phone: t.phone ?? "",
      defaultPrompt: "", // Se edita en Prompts del tenant
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    try {
      const slug = form.slug || form.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      if (editingId) {
        await updateTenant({
          tenantId: editingId,
          name: form.name,
          slug,
          status: form.status,
          planId: form.planId || undefined,
          primaryColor: form.primaryColor || undefined,
          secondaryColor: form.secondaryColor || undefined,
          address: form.address || undefined,
          phone: form.phone || undefined,
        });
      } else {
        const tenantId = await createTenant({
          name: form.name,
          slug,
          status: form.status,
          planId: form.planId || undefined,
          primaryColor: form.primaryColor || undefined,
          secondaryColor: form.secondaryColor || undefined,
          address: form.address || undefined,
          phone: form.phone || undefined,
        });
        if (form.defaultPrompt.trim()) {
          await createPrompt({
            tenantId,
            name: "Prompt base",
            prompt: form.defaultPrompt,
            isDefault: true,
          });
        }
      }
      setShowModal(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al guardar");
    }
  };

  const handleDelete = async (id: Id<"tenants">) => {
    if (!confirm("¿Eliminar este restaurante? Se perderán todos los datos asociados.")) return;
    try {
      await removeTenant({ tenantId: id });
      if (selectedTenantId === id) setSelectedTenantId(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al eliminar");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Restaurantes</h2>
          <p className="mt-1 text-sm text-slate-500">Crear, editar y gestionar restaurantes del SaaS.</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-red-600/25 transition hover:bg-red-700"
        >
          + Crear restaurante
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className={selectedTenant ? "lg:col-span-2" : "lg:col-span-3"}>
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {tenants === undefined ? (
              <div className="p-12 text-center text-slate-500">Cargando...</div>
            ) : tenants.length === 0 ? (
              <div className="p-12 text-center text-slate-500">No hay restaurantes. Crea el primero.</div>
            ) : (
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Restaurante
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Plan
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Estado
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Colores
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {tenants.map((r) => (
                    <tr
                      key={r._id}
                      className={`cursor-pointer hover:bg-slate-50 ${selectedTenantId === r._id ? "bg-red-50/50" : ""}`}
                      onClick={() => setSelectedTenantId(r._id)}
                    >
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-slate-800">{r.name}</p>
                          <p className="text-xs text-slate-500">/{r.slug}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{r.planName ?? "—"}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                            r.status === "active"
                              ? "bg-emerald-100 text-emerald-700"
                              : r.status === "trial"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {STATUS_LABELS[r.status]}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-1">
                          {r.primaryColor && (
                            <span
                              className="h-6 w-6 rounded-full border border-slate-200 shadow-inner"
                              style={{ backgroundColor: r.primaryColor }}
                              title={r.primaryColor}
                            />
                          )}
                          {r.secondaryColor && (
                            <span
                              className="h-6 w-6 rounded-full border border-slate-200 shadow-inner"
                              style={{ backgroundColor: r.secondaryColor }}
                              title={r.secondaryColor}
                            />
                          )}
                          {!r.primaryColor && <span className="text-xs text-slate-400">Sin config</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(r)}
                            className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-800"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(r._id)}
                            className="rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {selectedTenant && (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
              <h3 className="font-semibold text-slate-800">{selectedTenant.name}</h3>
              <p className="text-xs text-slate-500">/{selectedTenant.slug}</p>
            </div>
            <div className="flex border-b border-slate-200">
              <button
                type="button"
                onClick={() => setActiveTab("general")}
                className={`flex-1 px-4 py-2.5 text-sm font-medium transition ${
                  activeTab === "general"
                    ? "border-b-2 border-red-600 text-red-600"
                    : "text-slate-600 hover:text-slate-800"
                }`}
              >
                General
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("administradores")}
                className={`flex-1 px-4 py-2.5 text-sm font-medium transition ${
                  activeTab === "administradores"
                    ? "border-b-2 border-red-600 text-red-600"
                    : "text-slate-600 hover:text-slate-800"
                }`}
              >
                Administradores
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("prompt")}
                className={`flex-1 px-4 py-2.5 text-sm font-medium transition ${
                  activeTab === "prompt"
                    ? "border-b-2 border-red-600 text-red-600"
                    : "text-slate-600 hover:text-slate-800"
                }`}
              >
                Prompt
              </button>
            </div>
            <div className="p-4">
              {activeTab === "general" && (
                <div className="space-y-3 text-sm">
                  <p><span className="font-medium text-slate-600">Plan:</span> {selectedTenant.planName ?? "—"}</p>
                  <p><span className="font-medium text-slate-600">Estado:</span> {STATUS_LABELS[selectedTenant.status]}</p>
                  {selectedTenant.address && (
                    <p><span className="font-medium text-slate-600">Dirección:</span> {selectedTenant.address}</p>
                  )}
                  {selectedTenant.phone && (
                    <p><span className="font-medium text-slate-600">Teléfono:</span> {selectedTenant.phone}</p>
                  )}
                  <div className="flex gap-2">
                    {selectedTenant.primaryColor && (
                      <span
                        className="h-8 w-8 rounded-full border"
                        style={{ backgroundColor: selectedTenant.primaryColor }}
                      />
                    )}
                    {selectedTenant.secondaryColor && (
                      <span
                        className="h-8 w-8 rounded-full border"
                        style={{ backgroundColor: selectedTenant.secondaryColor }}
                      />
                    )}
                  </div>
                </div>
              )}
              {activeTab === "administradores" && (
                <AdministradoresTab tenantId={selectedTenant._id} />
              )}
              {activeTab === "prompt" && (
                <PromptTab tenantId={selectedTenant._id} />
              )}
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-800">
              {editingId ? "Editar restaurante" : "Crear restaurante"}
            </h3>
            <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="block text-sm font-medium text-slate-700">Nombre</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                  placeholder="La Parrilla"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Slug (opcional)</label>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                  placeholder="la-parrilla"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Plan</label>
                <select
                  value={form.planId}
                  onChange={(e) => setForm({ ...form, planId: e.target.value as Id<"plans"> | "" })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                >
                  <option value="">Sin plan</option>
                  {plans?.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name} - ${p.price}/mes
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Estado</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as Status })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                >
                  <option value="active">Activo</option>
                  <option value="trial">Prueba</option>
                  <option value="cancelled">Cancelado</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Color primario</label>
                  <div className="mt-1 flex gap-2">
                    <input
                      type="color"
                      value={form.primaryColor}
                      onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                      className="h-10 w-14 cursor-pointer rounded-lg border border-slate-300"
                    />
                    <input
                      type="text"
                      value={form.primaryColor}
                      onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                      className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Color secundario</label>
                  <div className="mt-1 flex gap-2">
                    <input
                      type="color"
                      value={form.secondaryColor}
                      onChange={(e) => setForm({ ...form, secondaryColor: e.target.value })}
                      className="h-10 w-14 cursor-pointer rounded-lg border border-slate-300"
                    />
                    <input
                      type="text"
                      value={form.secondaryColor}
                      onChange={(e) => setForm({ ...form, secondaryColor: e.target.value })}
                      className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Dirección</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                  placeholder="Calle Principal 123"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Teléfono</label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                  placeholder="+34 600 000 000"
                />
              </div>
              {!editingId && (
                <div>
                  <label className="block text-sm font-medium text-slate-700">Prompt por defecto (opcional)</label>
                  <textarea
                    rows={3}
                    value={form.defaultPrompt}
                    onChange={(e) => setForm({ ...form, defaultPrompt: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                    placeholder="Eres el asistente virtual del restaurante..."
                  />
                </div>
              )}
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

function PromptTab({ tenantId }: { tenantId: Id<"tenants"> }) {
  const defaultPrompt = useQuery(api.prompts.getDefault, { tenantId });
  const createPrompt = useMutation(api.prompts.create);
  const updatePrompt = useMutation(api.prompts.update);

  const [prompt, setPrompt] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (defaultPrompt !== undefined) {
      setPrompt(defaultPrompt?.prompt ?? "");
    }
  }, [defaultPrompt?._id, defaultPrompt?.prompt]);

  const currentText = defaultPrompt?.prompt ?? "";
  const hasChanges = prompt !== currentText;

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Prompt por defecto del asistente virtual para este restaurante.
      </p>
      {defaultPrompt === undefined ? (
        <p className="text-sm text-slate-500">Cargando...</p>
      ) : (
        <>
          <textarea
            rows={6}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Eres el asistente virtual del restaurante. Responde en tono cercano y profesional..."
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
          />
          <button
            type="button"
            disabled={!hasChanges || isSaving}
            onClick={async () => {
              const text = prompt.trim();
              if (!text) return;
              setIsSaving(true);
              try {
                if (defaultPrompt) {
                  await updatePrompt({ id: defaultPrompt._id, prompt: text });
                } else {
                  await createPrompt({
                    tenantId,
                    name: "Prompt base",
                    prompt: text,
                    isDefault: true,
                  });
                }
              } catch (err) {
                alert(err instanceof Error ? err.message : "Error al guardar");
              } finally {
                setIsSaving(false);
              }
            }}
            className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? "Guardando..." : "Guardar prompt"}
          </button>
        </>
      )}
    </div>
  );
}

function AdministradoresTab({ tenantId }: { tenantId: Id<"tenants"> }) {
  const members = useQuery(api.users.listByTenant, { tenantId });
  const allUsers = useQuery(api.users.list);
  const inviteToTenant = useMutation(api.users.inviteToTenant);
  const updateRole = useMutation(api.users.updateRole);
  const removeFromTenant = useMutation(api.users.removeFromTenant);
  const createUser = useMutation(api.users.create);

  const [showInvite, setShowInvite] = useState(false);
  const [inviteUserId, setInviteUserId] = useState<Id<"users"> | "">("");
  const [inviteRole, setInviteRole] = useState<"OWNER" | "ADMIN">("ADMIN");

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", email: "", password: "", role: "ADMIN" as "OWNER" | "ADMIN" });

  const existingUserIds = new Set(members?.map((m) => m.userId) ?? []);
  const availableUsers = allUsers?.filter((u) => !existingUserIds.has(u._id)) ?? [];

  const handleInvite = async () => {
    if (!inviteUserId) return;
    try {
      await inviteToTenant({ tenantId, userId: inviteUserId, role: inviteRole as "OWNER" | "ADMIN" });
      setShowInvite(false);
      setInviteUserId("");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al invitar");
    }
  };

  const handleCreateAndInvite = async () => {
    if (!createForm.name.trim() || !createForm.email.trim()) {
      alert("Nombre y email son obligatorios");
      return;
    }
    try {
      const userId = await createUser({
        name: createForm.name,
        email: createForm.email,
        password: createForm.password || undefined,
      });
      await inviteToTenant({ tenantId, userId, role: createForm.role });
      setShowCreate(false);
      setCreateForm({ name: "", email: "", password: "", role: "ADMIN" });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al registrar");
    }
  };

  const ROL_LABELS: Record<string, string> = {
    OWNER: "Propietario",
    ADMIN: "Administrador",
    AGENT: "Agente",
    VIEWER: "Visualizador",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-slate-600">Administradores del restaurante</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
          >
            + Registrar
          </button>
          <button
            type="button"
            onClick={() => setShowInvite(true)}
            disabled={availableUsers.length === 0}
            className="rounded-lg border border-red-600 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            Invitar existente
          </button>
        </div>
      </div>

      {members === undefined ? (
        <p className="text-sm text-slate-500">Cargando...</p>
      ) : members.length === 0 ? (
        <p className="text-sm text-slate-500">No hay administradores asignados.</p>
      ) : (
        <ul className="space-y-2">
          {members.map((m) => (
            <li
              key={m._id}
              className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2"
            >
              <div>
                <p className="font-medium text-slate-800">{m.user?.name ?? "—"}</p>
                <p className="text-xs text-slate-500">{m.user?.email ?? "—"}</p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={m.role}
                  onChange={async (e) => {
                    try {
                      await updateRole({ userTenantId: m._id, role: e.target.value as "OWNER" | "ADMIN" | "AGENT" | "VIEWER" });
                    } catch (err) {
                      alert(err instanceof Error ? err.message : "Error");
                    }
                  }}
                  className="rounded border border-slate-200 bg-white px-2 py-1 text-xs"
                >
                  {(["OWNER", "ADMIN", "AGENT", "VIEWER"] as const).map((r) => (
                    <option key={r} value={r}>{ROL_LABELS[r]}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={async () => {
                    if (!confirm("¿Quitar a este usuario del restaurante?")) return;
                    try {
                      await removeFromTenant({ userTenantId: m._id });
                    } catch (err) {
                      alert(err instanceof Error ? err.message : "Error");
                    }
                  }}
                  className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                >
                  Quitar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {showCreate && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="mb-2 text-sm font-medium text-slate-700">Registrar nuevo administrador (OWNER o ADMIN)</p>
          <input
            type="text"
            placeholder="Nombre"
            value={createForm.name}
            onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
            className="mb-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="email"
            placeholder="Email"
            value={createForm.email}
            onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
            className="mb-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="password"
            placeholder="Contraseña (opcional)"
            value={createForm.password}
            onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
            className="mb-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <select
            value={createForm.role}
            onChange={(e) => setCreateForm({ ...createForm, role: e.target.value as "OWNER" | "ADMIN" })}
            className="mb-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="OWNER">Propietario</option>
            <option value="ADMIN">Administrador</option>
          </select>
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowCreate(false)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100">Cancelar</button>
            <button type="button" onClick={handleCreateAndInvite} className="rounded-lg bg-red-600 px-3 py-2 text-sm text-white hover:bg-red-700">Registrar e invitar</button>
          </div>
        </div>
      )}

      {showInvite && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="mb-2 text-sm font-medium text-slate-700">Invitar usuario</p>
          <select
            value={inviteUserId}
            onChange={(e) => setInviteUserId(e.target.value as Id<"users"> | "")}
            className="mb-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Seleccionar usuario...</option>
            {availableUsers.map((u) => (
              <option key={u._id} value={u._id}>{u.name} ({u.email})</option>
            ))}
          </select>
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as "OWNER" | "ADMIN")}
            className="mb-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="OWNER">Propietario</option>
            <option value="ADMIN">Administrador</option>
          </select>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowInvite(false)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleInvite}
              disabled={!inviteUserId}
              className="rounded-lg bg-red-600 px-3 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50"
            >
              Invitar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
