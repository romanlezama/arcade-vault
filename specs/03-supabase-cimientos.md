# SPEC 03 — Supabase: cimientos de la integración

> **Estado:** Implementado
> **Depende de:** —
> **Fecha:** 2026-11-21
> **Objetivo:** Conectar la app de Next.js con el proyecto Supabase remoto (clientes tipados, variables de entorno, migraciones versionadas y un endpoint `/api/health`) sin cambiar ninguna funcionalidad visible.

## Por qué existe esta spec

Hoy la sesión (`av_user`) y las puntuaciones (`av_scores`) son simuladas en localStorage desde `lib/session.ts`. Las próximas specs (auth real y ranking real) necesitan Supabase. Esta spec monta solo la base común: dependencias, clientes, entorno, migraciones y tipos. Así cada spec posterior se limita a su feature y no repite infraestructura. El proyecto remoto es `difzowerixncvfqodpjw` y hoy no tiene tablas en `public`.

## Alcance

**Entra:**

- Dependencias `@supabase/supabase-js` y `@supabase/ssr`. La CLI `supabase` se añade como devDependency.
- Variables de entorno `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`:
  - `.env.local` con los valores reales (ignorado por git).
  - `.env.example` con los nombres y sin valores (commiteado).
  - `.gitignore`: añadir `!.env.example` tras la regla `.env*`.
- Carpeta `supabase/` creada con `supabase init` y enlazada al proyecto remoto con `supabase link`.
- Primera migración en `supabase/migrations/` con la función SQL `public.health()`.
- Tipos generados en `lib/database.types.ts`.
- Clientes tipados:
  - `lib/supabase/client.ts`: cliente de navegador (`createBrowserClient<Database>`).
  - `lib/supabase/server.ts`: cliente de servidor (`createServerClient<Database>` con `cookies()`).
- Route Handler `GET /api/health`, que llama a `supabase.rpc("health")` con el cliente de servidor.
- Scripts npm `db:types` y `db:push`.
- Documentación: sección "Supabase" en `README.md` y los nuevos comandos en `CLAUDE.md`.

**Fuera de alcance (para specs futuras):**

- Supabase Auth y la sustitución del login simulado (`av_user`).
- `proxy.ts` para refrescar la sesión. Llega con la spec de auth.
- Tablas de puntuaciones y la sustitución de `av_scores`.
- Conectar el Salón de la Fama, el Detalle o la Home a datos reales.
- Stack local con Docker (`supabase start`).
- Clave `service_role`/secret y cualquier cliente con privilegios de administrador.
- Edge Functions, Storage y Realtime.
- Cambios en `lib/session.ts` o en cualquier pantalla.
- Tests automatizados.

## Modelo de datos

La spec no añade tablas. Solo introduce una función SQL de diagnóstico:

```sql
-- supabase/migrations/<timestamp>_health.sql
create or replace function public.health()
returns text
language sql
stable
security invoker
set search_path = ''
as $$ select 'ok' $$;
```

```bash
# .env.example
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

```ts
// lib/database.types.ts — generado, no se edita a mano
export type Database = {
  public: { Functions: { health: { Args: never; Returns: string } } /* … */ };
};

// lib/supabase/client.ts
export function createClient(): SupabaseClient<Database>; // navegador

// lib/supabase/server.ts
export async function createClient(): Promise<SupabaseClient<Database>>; // servidor, usa await cookies()
```

```jsonc
// package.json → scripts
"db:types": "supabase gen types typescript --remote --schema public > lib/database.types.ts",
"db:push": "supabase db push --remote"
```

Respuesta de `GET /api/health`:

```ts
// 200
{ supabase: "ok" }
// 503
{ supabase: "error", message: string }
```

Convenciones:

- Las dos funciones se llaman `createClient`. Se distinguen por la ruta de import (`@/lib/supabase/client` o `@/lib/supabase/server`).
- Si falta una variable de entorno, `createClient` lanza un `Error` cuyo mensaje nombra la variable que falta.
- En `lib/supabase/server.ts`, `setAll` de cookies va dentro de `try/catch`. Los Server Components no pueden escribir cookies, y en esta spec no hay sesión que escribir.
- `/api/health` responde con `Cache-Control: no-store`.

## Plan de implementación

1. **Dependencias y entorno.**
   - `npm i @supabase/supabase-js @supabase/ssr` y `npm i -D supabase`.
   - Crear `.env.example` y añadir `!.env.example` a `.gitignore`.
   - Crear `.env.local` con la URL y la publishable key del proyecto (obtenidas con el MCP de Supabase o en el dashboard).
   - Prueba manual: `git status` muestra `.env.example` pero no `.env.local`, y `npm run build` pasa.
2. **CLI y enlace con el remoto.**
   - `npx supabase init` (crea `supabase/config.toml`).
   - Paso del usuario: `npx supabase login` y `npx supabase link --project-ref difzowerixncvfqodpjw`. Pide la contraseña de la base de datos.
   - Prueba manual: `npx supabase migration list --remote` responde sin error.
3. **Migración `health`.**
   - `npx supabase migration new health` y escribir la función del modelo de datos.
   - Añadir el script `db:push` y ejecutar `npm run db:push`.
   - Prueba manual: `npx supabase migration list --remote` muestra la migración en Local y Remote, y `select public.health();` devuelve `ok` en el SQL editor.
4. **Tipos.**
   - Añadir el script `db:types` y ejecutar `npm run db:types`.
   - Prueba manual: `lib/database.types.ts` contiene `health` en `Functions` y `npx tsc --noEmit` pasa.
5. **Clientes.**
   - Crear `lib/supabase/client.ts` y `lib/supabase/server.ts`, ambos tipados con `Database`.
   - Prueba manual: `npx tsc --noEmit` y `npm run lint` pasan.
6. **Endpoint `/api/health`.**
   - Crear `app/api/health/route.ts` con un `GET` que llama a `supabase.rpc("health")` con el cliente de servidor.
   - Si la respuesta es `"ok"`, devuelve 200 `{ supabase: "ok" }`. Ante cualquier error (incluida una variable de entorno ausente) devuelve 503 `{ supabase: "error", message }`.
   - Consultar antes `node_modules/next/dist/docs/01-app/` sobre Route Handlers con Cache Components. Si hace falta, usar `await connection()` para que no se prerenderice.
   - Prueba manual: con `npm run dev`, `curl -i localhost:3000/api/health` devuelve 200 y `{"supabase":"ok"}`.
7. **Documentación.**
   - `README.md`: sección "Supabase" (en español) con el setup de `.env.local`, `supabase login`/`link`, el flujo "migración nueva → `db:push` → `db:types`" y el uso de `/api/health`.
   - `CLAUDE.md`: añadir `npm run db:types` y `npm run db:push` a Commands, con una línea sobre `lib/supabase/`.

## Criterios de aceptación

- [ ] `package.json` incluye `@supabase/supabase-js` y `@supabase/ssr` en `dependencies` y `supabase` en `devDependencies`.
- [ ] `.env.example` está en git con `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` vacías.
- [ ] `.env.local` no aparece en `git status` ni en ningún commit.
- [ ] Ningún archivo del repo contiene el valor de una clave secret (`sb_secret_…`) ni de la clave `service_role`. Las menciones del nombre en documentación o comentarios no cuentan.
- [ ] `supabase/config.toml` y exactamente una migración `*_health.sql` existen en `supabase/migrations/`.
- [ ] `npx supabase migration list --remote` muestra la migración `health` aplicada en Local y en Remote.
- [ ] `lib/database.types.ts` existe, exporta `Database` e incluye la función `health`.
- [ ] `supabase.rpc("health")` está tipado: `data` es `string | null` sin casts.
- [ ] `npm run build`, `npm run lint` y `npx tsc --noEmit` terminan sin errores.
- [ ] Las rutas `/`, `/biblioteca`, `/login`, `/salon` y `/juegos/[id]` se siguen prerenderizando igual que antes de la spec.
- [ ] `GET /api/health` devuelve 200 con `{"supabase":"ok"}` y la cabecera `Cache-Control: no-store`.
- [ ] Con `NEXT_PUBLIC_SUPABASE_URL` vacía, `GET /api/health` devuelve 503 con `supabase: "error"` y un `message` que nombra la variable.
- [ ] El esquema `public` sigue sin tablas.
- [ ] Login, guardado de puntuación y Salón de la Fama se comportan igual que antes (siguen usando localStorage).
- [ ] No existe `proxy.ts` ni `middleware.ts` en la raíz.
- [ ] `README.md` tiene una sección "Supabase" y `CLAUDE.md` lista `db:types` y `db:push`.

## Decisiones

- **Sí:** spec solo de cimientos. Auth y puntuaciones son features con decisiones propias (proveedor de login, RLS, esquema de scores). Merecen specs separadas.
- **No:** auth y puntuaciones en esta spec. Tocarían a la vez la base de datos, la sesión y varias pantallas.
- **Sí:** migraciones en `supabase/migrations/` versionadas en git. El esquema queda en el historial y es reproducible.
- **No:** aplicar el esquema solo desde el MCP o el dashboard. Se perdería el historial de cambios.
- **Sí:** solo el proyecto remoto, sin Docker. Es suficiente para el proyecto del curso y evita montar el stack local.
- **No:** `supabase start` con Docker. Si hace falta más adelante, irá en otra spec.
- **Sí:** tipos generados en `lib/database.types.ts` desde el primer día. Los clientes quedan tipados antes de que existan tablas.
- **Sí:** publishable key (`sb_publishable_…`) con `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Es el formato actual de Supabase.
- **No:** anon key legacy (JWT).
- **Sí:** `.env.local` más `.env.example`. Documenta las variables sin exponer valores.
- **No:** `proxy.ts` ahora. Sin auth real no hay sesión que refrescar y solo añadiría código en cada request. Llega con la spec de auth.
- **Sí:** `/api/health` con `public.health()` vía RPC. Prueba de punta a punta la migración, los tipos, el cliente de servidor y la base de datos, sin crear tablas.
- **No:** tabla de prueba. Añadiría una tabla que nadie usa.
- **No:** ping a `/auth/v1/health`. No tocaría la base de datos ni el cliente tipado.
- **Sí:** scripts `db:types` y `db:push`. Hacen repetible el flujo "migración → remoto → tipos".
- **Sí:** comandos de la CLI v3 con `--remote`. En la v3, `db push`, `migration list` y `gen types` apuntan al stack local por defecto, y `--remote` sustituye a `--linked`.
- **No:** fijar la CLI en la v2 para conservar los comandos sin flag. Supondría quedarse en una versión anterior.
- **Sí:** clientes en `lib/supabase/` con el nombre `createClient` en ambos, siguiendo la convención de la documentación de `@supabase/ssr`.
- **Sí:** `lib/session.ts` no se toca. El comportamiento visible queda idéntico hasta la spec de auth.

## Riesgos

| Riesgo                                                                                | Mitigación                                                                                                                                                                                     |
| ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Commitear secretos por error                                                          | `.env*` sigue ignorado y solo se exceptúa `.env.example`. Solo se usa la publishable key, que es pública por diseño. Un criterio de aceptación busca valores de clave secret y `service_role`. |
| El cliente de servidor usa `cookies()` y vuelve dinámicas rutas que hoy son estáticas | Solo `/api/health` importa `lib/supabase/server.ts`. Un criterio de aceptación comprueba que las rutas existentes se siguen prerenderizando.                                                   |
| `/api/health` se prerenderiza en el build o queda cacheado                            | Usa `cookies()` (request-time) y, si hace falta, `await connection()`. Responde con `Cache-Control: no-store`.                                                                                 |
| `supabase link` y `db push` piden credenciales interactivas                           | Son pasos del usuario, documentados en el plan y en el README.                                                                                                                                 |
| `lib/database.types.ts` queda desfasado tras una migración                            | El README fija el flujo "migración → `db:push` → `db:types`".                                                                                                                                  |
| `public.health()` es invocable por `anon`                                             | Solo devuelve `'ok'`, no lee datos y usa `security invoker` con `search_path` vacío.                                                                                                           |

## Lo que **no** entra en esta spec

- Supabase Auth, login real y `proxy.ts`.
- Tablas de puntuaciones y ranking real.
- Datos reales en la Home, el Detalle o el Salón de la Fama.
- Stack local con Docker.
- Clave secret/`service_role`, Edge Functions, Storage y Realtime.
- Tests automatizados.

Cada uno de estos puntos, si llega, va en su propia spec.
