# nomorepos

Monorepo con Next.js (frontend) y Convex (backend). Usa Bun y Turbo.

## Estructura

```
nomorepos/
├── apps/
│   ├── web/        # Next.js (frontend)
│   └── backend/    # Convex (backend)
├── package.json
├── turbo.json
└── tsconfig.json
```

## Setup

1. Instalar dependencias:
   ```bash
   bun install
   ```

2. Convex (primera vez): en `apps/backend` ejecuta `convex dev` y sigue el flujo de login. Te pedirá crear/ligar un proyecto Convex.

3. Copiar env:
   ```bash
   cp .env.example .env.local
   ```
   Tras el primer `convex dev`, obtendrás `NEXT_PUBLIC_CONVEX_URL`. Ponla en `apps/web/.env.local`.

## Desarrollar

Ejecutar ambos en paralelo:

```bash
bun run dev
```

- **Web**: http://localhost:3000
- **Convex**: se sincroniza con la nube

## Scripts

| Comando       | Descripción                     |
|---------------|---------------------------------|
| `bun run dev` | Inicia web + Convex en paralelo |
| `bun run build` | Build de todas las apps       |
| `bun run lint`  | Lint de todas las apps       |
