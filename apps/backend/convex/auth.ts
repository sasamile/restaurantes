import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

function randomSalt(): Uint8Array {
  const arr = new Uint8Array(16);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(arr);
  } else {
    for (let i = 0; i < 16; i++) arr[i] = Math.floor(Math.random() * 256);
  }
  return arr;
}

function uint8ToHex(arr: Uint8Array): string {
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hashPassword(password: string, salt: Uint8Array): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const saltBuffer = new ArrayBuffer(salt.length);
  new Uint8Array(saltBuffer).set(salt);
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: saltBuffer,
      iterations: 100_000,
    },
    key,
    256
  );
  return uint8ToHex(new Uint8Array(bits));
}

async function verifyPassword(
  password: string,
  stored: string
): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const salt = new Uint8Array(
    saltHex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
  );
  const derived = await hashPassword(password, salt);
  return derived === hashHex;
}

/**
 * Registra un usuario superadmin con email y contraseña.
 * Ejecutar una vez desde el dashboard de Convex:
 * Functions → auth.registerSuperadmin → Run con:
 * { "email": "nspes2020@gmail.com", "password": "Sa722413", "name": "Superadmin" }
 */
export const registerSuperadmin = mutation({
  args: {
    email: v.string(),
    password: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existing) {
      throw new Error("Ya existe un usuario con ese email");
    }

    const salt = randomSalt();
    const derived = await hashPassword(args.password, salt);
    const passwordHash = `${uint8ToHex(salt)}:${derived}`;
    const now = Date.now();

    return await ctx.db.insert("users", {
      name: args.name,
      email: args.email,
      passwordHash,
      isSuperadmin: true,
      createdAt: now,
    });
  },
});

export const getByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
    if (!user) return null;
    const { passwordHash: _, ...safe } = user;
    return safe;
  },
});

/**
 * Login: valida email + password y devuelve el usuario (sin passwordHash).
 * Usar desde el front: auth.login({ email, password })
 */
export const login = mutation({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (!user || !user.passwordHash) {
      throw new Error("Credenciales inválidas");
    }

    const valid = await verifyPassword(args.password, user.passwordHash);
    if (!valid) {
      throw new Error("Credenciales inválidas");
    }

    const { passwordHash: _, ...safe } = user;
    return safe;
  },
});
