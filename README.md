## Arcade Vault

Es una plataforma para jugar online y competir por la mayor cantidad de puntos.

## Usa Spec Driven Design

Basado en /spec y /spec-impl

Siguiendo las buenas practicas recomendadas aquí:
https://github.com/Klerith/fernando-skills

## Skills usadas

```bash
npx skills@latest add Klerith/fernando-skills
```

## Hola Mundo

## Supabase

La app se conecta al proyecto Supabase remoto `difzowerixncvfqodpjw` (ver `specs/03-supabase-cimientos.md`). No se usa stack local con Docker.

### Configuración inicial

1. Copia `.env.example` a `.env.local` y rellena los valores (Project Settings → API en el dashboard):

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://difzowerixncvfqodpjw.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   ```

   `.env.local` está ignorado por git. Usa solo la publishable key; nunca la clave secret ni `service_role`.

2. Inicia sesión y enlaza la CLI (son pasos interactivos, se hacen una vez por máquina):

   ```bash
   npx supabase login
   npx supabase link --project-ref difzowerixncvfqodpjw
   ```

   Opcional: añade `SUPABASE_DB_PASSWORD=...` a `.env.local` y cárgalo en la shell (`set -a; . ./.env.local; set +a`) para que la CLI no pida la contraseña de la base de datos.

### Flujo de cambios en el esquema

La CLI es la v3: sus comandos apuntan al stack local por defecto, por eso los scripts usan `--remote`.

```bash
npx supabase migration new <nombre>   # crea supabase/migrations/<timestamp>_<nombre>.sql
npm run db:push                       # aplica las migraciones pendientes al proyecto remoto
npm run db:types                      # regenera lib/database.types.ts
npx supabase migration list --remote  # compara migraciones locales y remotas
```

Ejecuta siempre `db:types` después de `db:push` para que los tipos no queden desfasados.

### Clientes

- `@/lib/supabase/client`: `createClient()` para Client Components (navegador).
- `@/lib/supabase/server`: `await createClient()` para Server Components, Route Handlers y Server Actions.

Ambos están tipados con `Database` de `lib/database.types.ts`.

### Comprobar la conexión

Con `npm run dev` levantado:

```bash
curl -i localhost:3000/api/health
```

- `200 {"supabase":"ok"}`: la app llega a la base de datos (llama a la función SQL `public.health()`).
- `503 {"supabase":"error","message":"..."}`: falla la conexión o falta una variable de entorno; el `message` dice cuál.
