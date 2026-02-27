import { query } from "./_generated/server";

/** Estadísticas para el dashboard superadmin */
export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const tenants = await ctx.db.query("tenants").collect();
    const plans = await ctx.db.query("plans").collect();
    const users = await ctx.db.query("users").collect();
    const conversations = await ctx.db.query("conversations").collect();

    // Valor estimado: suma del precio del plan de cada restaurante activo
    let valorEstimado = 0;
    for (const t of tenants) {
      if (t.status !== "cancelled" && t.planId) {
        const plan = plans.find((p) => p._id === t.planId);
        if (plan) valorEstimado += plan.price;
      }
    }

    const activeTenants = tenants.filter((t) => t.status === "active").length;
    const trialTenants = tenants.filter((t) => t.status === "trial").length;

    return {
      totalRestaurantes: tenants.length,
      restaurantesActivos: activeTenants,
      restaurantesTrial: trialTenants,
      totalPlanes: plans.length,
      totalUsuarios: users.length,
      totalConversaciones: conversations.length,
      valorEstimadoMensual: valorEstimado,
    };
  },
});
