# SPEC 05 — Leaderboard real en Supabase y tabla de juegos en el Salón

> **Estado:** Implementado
> **Depende de:** SPEC 01, SPEC 03, SPEC 04
> **Fecha:** 2026-11-21
> **Objetivo:** Guardar las puntuaciones en una tabla `scores` de Supabase y mostrar en el Salón de la Fama el ranking real por juego más una tabla resumen "TODOS LOS JUEGOS".

## Por qué existe esta spec

Hoy el Salón de la Fama muestra datos inventados: `seededScores()` genera filas deterministas y "TU MEJOR MARCA" es una cifra ficticia. Al guardar, `saveScore()` escribe en `av_scores` de localStorage, que nadie lee. SPEC 03 dejó Supabase conectado pero sin tablas. Esta spec crea la primera tabla real (`scores`), hace que GUARDAR PUNTUACIÓN escriba en ella y que el Salón lea de ella.

Todavía no hay auth real. Por eso la inserción es anónima y se limita con constraints en la base de datos. Es falsificable a propósito hasta la spec de auth.

## Alcance

**Entra:**

- Migración `supabase/migrations/<timestamp>_scores.sql` con la tabla `public.scores`, sus constraints, un índice y RLS:
  - `anon` y `authenticated` pueden hacer `SELECT` e `INSERT`.
  - Nadie puede hacer `UPDATE` ni `DELETE` desde la API.
- Tipos regenerados en `lib/database.types.ts` (`npm run db:types`).
- Módulo de acceso a datos `lib/scores-db.ts` (cliente de navegador):
  - `fetchScores()` trae las puntuaciones.
  - `insertScore()` inserta una.
- Módulo puro `lib/leaderboard.ts` (sin React ni Supabase) que calcula en el cliente:
  - Ranking de un juego con la mejor marca por jugador (top 10).
  - Mejor marca y rango de un jugador concreto en un juego.
  - Resumen por juego: campeón, mejor puntuación y número de partidas guardadas.
  - `normalizePlayerName()`, que se mueve aquí desde `components/game-player.tsx`.
- Modal "FIN DEL JUEGO" (`components/game-player.tsx`):
  - GUARDAR PUNTUACIÓN inserta en Supabase con estados explícitos (deshabilitado, guardando, guardado, error).
  - Deja de escribir `av_scores`.
- `lib/session.ts`: se eliminan `saveScore`, `SavedScore` y la clave `av_scores`.
- Salón de la Fama (`components/hall-of-fame.tsx`):
  - Lee de Supabase en el navegador al montar.
  - Podio y tabla con el top 10 real de la pestaña activa.
  - "TU MEJOR MARCA" real (rango y puntuación del usuario en sesión), solo si tiene puntuación en ese juego.
  - Estados de carga (skeleton), error (con REINTENTAR) y vacío ("SÉ EL PRIMERO").
- Nuevo componente `components/games-summary.tsx`: tabla "TODOS LOS JUEGOS" debajo del ranking, una fila por juego de `GAMES`. Clic en una fila selecciona esa pestaña y hace scroll arriba.
- Estilos nuevos en `app/globals.css` (tabla resumen, skeleton, error, vacío), diseñados con `/frontend-design`.

**Fuera de alcance (para specs futuras):**

- Supabase Auth y vincular puntuaciones a un usuario real.
- Tabla `games` en la base de datos o mover el catálogo `GAMES` a Supabase.
- Datos reales en el aside "MEJORES PUNTUACIONES" del Detalle (sigue con `seededScores`).
- Datos reales en la Home (`RECENT_SCORES`, `TOP_PLAYERS`, `HOME_STATS`).
- `best` y `plays` reales en las fichas de `GAMES` (Biblioteca y Detalle).
- Funciones RPC o vistas SQL para el ranking.
- Anti-trampas: validación de la puntuación en servidor, rate limiting, captcha.
- Migrar las puntuaciones que ya existan en `av_scores` de algún navegador.
- Moderación o borrado de puntuaciones desde la UI.
- Realtime (el Salón no se actualiza solo con puntuaciones nuevas).
- Paginación o rankings de más de 10 filas.
- Tests automatizados.

## Modelo de datos

```sql
-- supabase/migrations/<timestamp>_scores.sql
create table public.scores (
  id          bigint generated always as identity primary key,
  game_id     text        not null,
  player_name text        not null,
  score       integer     not null,
  created_at  timestamptz not null default now(),

  constraint scores_game_id_check check (game_id in (
    'bloque-buster', 'caida', 'serpentina', 'gloton', 'invasores',
    'rocas', 'ranaria', 'duelo-pixel', 'asteroides'
  )),
  constraint scores_player_name_check check (
    char_length(player_name) between 1 and 10
    and player_name = upper(player_name)
  ),
  constraint scores_score_check check (score between 0 and 10000000)
);

create index scores_game_score_idx on public.scores (game_id, score desc, created_at);

alter table public.scores enable row level security;

create policy "scores: lectura pública" on public.scores
  for select to anon, authenticated using (true);

create policy "scores: inserción pública" on public.scores
  for insert to anon, authenticated with check (true);

grant select, insert on public.scores to anon, authenticated;
```

```ts
// lib/scores-db.ts — usa createClient de @/lib/supabase/client
export type ScoreRecord = {
  gameId: string;
  playerName: string;
  score: number;
  createdAt: string; // ISO de created_at
};

/** select game_id, player_name, score, created_at order by score desc limit 1000 */
export async function fetchScores(): Promise<ScoreRecord[]>; // lanza Error si Supabase falla

export async function insertScore(entry: {
  gameId: string;
  playerName: string;
  score: number;
}): Promise<void>; // lanza Error si Supabase falla
```

```ts
// lib/leaderboard.ts — funciones puras
export type LeaderboardRow = {
  rank: number; // 1..10
  name: string;
  score: number;
  date: string; // "DD/MM/YYYY", de createdAt
};

export type PlayerBest = { rank: number; score: number; date: string };

export type GameSummary = {
  gameId: string;
  title: string;
  champion: string | null; // null si el juego no tiene puntuaciones
  best: number | null;
  plays: number; // filas guardadas de ese juego, no jugadores únicos
};

export function normalizePlayerName(value: string): string; // upper + slice(0, 10)
export function leaderboardFor(
  records: ScoreRecord[],
  gameId: string,
  limit?: number,
): LeaderboardRow[]; // limit = 10
export function playerBestFor(
  records: ScoreRecord[],
  gameId: string,
  name: string,
): PlayerBest | null;
export function summarizeGames(
  records: ScoreRecord[],
  games: Game[],
): GameSummary[]; // mismo orden que GAMES
```

Convenciones:

- Mejor marca por jugador: cada `player_name` aparece una vez por juego, con su puntuación más alta.
- Desempate: con la misma puntuación gana el `created_at` más antiguo.
- `rank` de `playerBestFor` es la posición del jugador en el ranking completo del juego, sin límite de 10.
- "TU MEJOR MARCA" busca por `normalizePlayerName(user.name)`.
- El nombre que se guarda es el del input del modal, ya normalizado.
- Fechas: `created_at` formateado en la zona horaria del navegador como `DD/MM/YYYY`.
- El Salón hace una sola consulta al montar y otra con cada REINTENTAR. Cambiar de pestaña o hacer clic en el resumen no vuelve a consultar.
- Las peticiones que terminan después de desmontar se ignoran (Strict Mode monta dos veces en desarrollo).
- Ningún archivo de esta spec importa `lib/supabase/server.ts`.

## Plan de implementación

1. **Migración `scores`.**
   - `npx supabase migration new scores` y escribir el SQL del modelo de datos.
   - `npm run db:push`.
   - Prueba manual: `npx supabase migration list --remote` muestra `scores` en Local y Remote. En el SQL editor, un `insert` con `game_id = 'pong'` falla por constraint.
2. **Tipos.**
   - `npm run db:types`.
   - Prueba manual: `lib/database.types.ts` incluye `scores` en `Tables` y `npx tsc --noEmit` pasa.
3. **Lógica pura del ranking.**
   - Crear `lib/leaderboard.ts` con `normalizePlayerName`, `leaderboardFor`, `playerBestFor` y `summarizeGames`.
   - `components/game-player.tsx` importa `normalizePlayerName` de aquí y borra su copia local.
   - Prueba manual: `npx tsc --noEmit` y `npm run lint` pasan, y el modal sigue poniendo el nombre en mayúsculas con 10 caracteres como máximo.
4. **Acceso a datos.**
   - Crear `lib/scores-db.ts` con `fetchScores` e `insertScore`, usando el cliente de navegador tipado.
   - Prueba manual: `npx tsc --noEmit` pasa sin casts en el mapeo de filas.
5. **Guardado desde el modal.**
   - En `components/game-player.tsx`, `onSave` llama a `insertScore`. Estados del botón:
     - Nombre vacío: deshabilitado.
     - Insertando: "GUARDANDO_" y deshabilitado (sin doble envío).
     - Éxito: "▸ PUNTUACIÓN GUARDADA_", como hoy.
     - Fallo: mensaje "ERROR AL GUARDAR" y el botón se reactiva.
   - JUGAR DE NUEVO resetea también el estado de guardado y el error.
   - Eliminar `saveScore`, `SavedScore` y `SCORES_KEY` de `lib/session.ts`.
   - Prueba manual: guardar una partida de ASTEROIDES crea una fila en `public.scores` y `av_scores` no cambia en localStorage.
6. **Salón con datos reales.**
   - `components/hall-of-fame.tsx` deja de importar `seededScores`.
   - Al montar llama a `fetchScores()` y guarda `status: "loading" | "error" | "ready"` y los registros.
   - Podio y tabla salen de `leaderboardFor(records, tab)`. Con menos de 3 filas, los puestos vacíos del podio muestran "—".
   - "TU MEJOR MARCA" sale de `playerBestFor`. Si devuelve `null`, el bloque no se muestra.
   - Estados (con `/frontend-design`):
     - Cargando: filas skeleton con "CARGANDO_".
     - Error: "SEÑAL PERDIDA" y botón REINTENTAR.
     - Vacío: "SÉ EL PRIMERO" con enlace a `/juegos/<tab>/jugar`.
   - Prueba manual: `/salon` muestra la puntuación guardada en el paso 5 en la pestaña ASTEROIDES.
7. **Tabla "TODOS LOS JUEGOS".**
   - Crear `components/games-summary.tsx`, que recibe `GameSummary[]` y `onSelect(gameId)`.
   - Columnas: JUEGO, CAMPEÓN, MEJOR y PARTIDAS. Sin puntuaciones: "—", "—" y 0.
   - Cada fila es un `<button>`. Al pulsarla, cambia la pestaña y hace `scrollTo` arriba con `smooth`.
   - Montarla en el Salón entre la tabla del ranking y VOLVER A LA BIBLIOTECA. Comparte los estados de carga y error del Salón.
   - Estilos en `app/globals.css` diseñados con `/frontend-design`, coherentes con `.hall-table`.
   - Prueba manual: hacer clic en la fila ASTEROIDES activa esa pestaña.

## Criterios de aceptación

- [ ] `npm run build`, `npm run lint` y `npx tsc --noEmit` terminan sin errores.
- [ ] `/salon` se sigue prerenderizando como ruta estática en la salida de `npm run build`.
- [ ] `npx supabase migration list --remote` muestra la migración `scores` aplicada en Local y Remote.
- [ ] `lib/database.types.ts` incluye la tabla `scores`.
- [ ] Insertar con la publishable key un `game_id` fuera de los 9 ids, un nombre en minúsculas, un nombre de 11 caracteres o un `score` negativo falla.
- [ ] Un `update` o `delete` sobre `scores` con la publishable key no modifica ninguna fila.
- [ ] Guardar desde el modal crea exactamente una fila en `public.scores` con `game_id`, el nombre del input y la puntuación mostrada.
- [ ] Con el nombre vacío, GUARDAR PUNTUACIÓN está deshabilitado.
- [ ] Mientras se guarda, el botón muestra "GUARDANDO_" y un segundo clic no crea otra fila.
- [ ] Con la red cortada (DevTools offline), guardar muestra "ERROR AL GUARDAR" y el botón vuelve a estar activo.
- [ ] Guardar ya no escribe en `av_scores`, y `lib/session.ts` no exporta `saveScore`.
- [ ] Mientras carga, `/salon` muestra el skeleton "CARGANDO_".
- [ ] Con la red cortada, `/salon` muestra "SEÑAL PERDIDA". Al restaurarla, REINTENTAR carga los datos.
- [ ] Una pestaña sin puntuaciones muestra "SÉ EL PRIMERO" con un enlace a `/juegos/<id>/jugar`.
- [ ] La tabla del ranking muestra como máximo 10 filas, ordenadas de mayor a menor puntuación.
- [ ] Si un jugador guarda 3 puntuaciones en un juego, aparece una sola vez, con la más alta.
- [ ] Con dos jugadores empatados, el que guardó antes aparece por encima.
- [ ] El podio muestra los 3 primeros del ranking, y "—" en los puestos que no tienen jugador.
- [ ] Con sesión iniciada y una puntuación guardada con su nombre, "TU MEJOR MARCA" muestra el rango y la puntuación reales.
- [ ] Sin sesión, o sin puntuación en ese juego, el bloque "TU MEJOR MARCA" no aparece.
- [ ] Cambiar de pestaña no lanza una nueva petición a Supabase (pestaña Network).
- [ ] La tabla "TODOS LOS JUEGOS" aparece debajo del ranking, con 9 filas en el orden de `GAMES`.
- [ ] Cada fila de la tabla resumen muestra el campeón, la mejor puntuación y el número de partidas guardadas, que coinciden con la tabla `scores`.
- [ ] Un juego sin puntuaciones muestra "—", "—" y 0 en la tabla resumen.
- [ ] Hacer clic en una fila de la tabla resumen activa esa pestaña y lleva la vista arriba.
- [ ] El aside del Detalle y la Home se ven exactamente igual que antes de la spec.

## Decisiones

- **Sí:** tabla `public.scores` en Supabase. Es el primer dato real de la plataforma y sustituye al `av_scores` que nadie leía.
- **Sí:** "tabla de juegos" es una tabla visual en el Salón ("TODOS LOS JUEGOS"). Es lo que pidió el usuario.
- **No:** tabla `games` en la base de datos. El catálogo sigue en `lib/games.ts` y moverlo afecta al prerender de varias pantallas.
- **Sí:** `CHECK` con los 9 ids en `game_id`. Bloquea basura desde `anon` sin tabla `games`. Añadir un juego exige una migración nueva.
- **No:** `game_id` libre con solo un CHECK de formato. Admitiría ids inexistentes.
- **Sí:** inserción anónima con constraints (nombre de 1 a 10 caracteres en mayúsculas, score de 0 a 10 000 000) y sin `UPDATE`/`DELETE`. Permite un ranking real antes de la auth.
- **No:** esperar a la auth ni dejar el guardado en localStorage. El usuario prefirió el ranking real ya, asumiendo que es falsificable.
- **Sí:** mejor marca por jugador. Es lo que la UI ya mostraba (nombres únicos).
- **No:** listar todas las partidas. Un jugador podría ocupar todo el top.
- **Sí:** cálculo del ranking y del resumen en el cliente, en `lib/leaderboard.ts`. Elección del usuario: simple y sin SQL extra.
- **No:** funciones RPC ni vistas SQL. Se reconsiderarán si el volumen de datos lo pide.
- **Sí:** lectura desde el navegador en el Salón. `/salon` sigue siendo un shell estático y siempre muestra datos frescos tras guardar.
- **No:** Server Component con Suspense. Volvería dinámica la ruta por las cookies y complicaría el cambio de pestaña.
- **Sí:** una sola consulta al montar, con `limit 1000` ordenada por puntuación. Cambiar de pestaña no consulta.
- **Sí:** top 10 y "TU MEJOR MARCA" real, buscando por nombre normalizado. Sin auth, el nombre es la única identidad disponible.
- **Sí:** estado vacío honesto ("SÉ EL PRIMERO"), sin datos semilla. No se mezclan datos falsos con reales.
- **No:** semilla demo en la migración.
- **Sí:** `av_scores` se elimina. Supabase es la única fuente de las puntuaciones.
- **No:** migrar las puntuaciones antiguas de `av_scores`. Son locales, simuladas y nadie las mostraba.
- **Sí:** estados explícitos al guardar (deshabilitado, guardando, guardado, error). El jugador sabe si su puntuación llegó.
- **No:** guardado optimista que ignora fallos.
- **Sí:** skeleton, error con REINTENTAR y estado vacío en el Salón.
- **Sí:** tabla resumen debajo del ranking, con filas clicables que cambian de pestaña.
- **Sí:** PARTIDAS cuenta las filas guardadas de ese juego, no los jugadores únicos ni las partidas jugadas sin guardar.
- **Sí:** el Detalle y la Home siguen con datos simulados. Se conectarán en otra spec.
- **Sí:** `normalizePlayerName` se mueve a `lib/leaderboard.ts`. El modal y el Salón deben normalizar igual.
- **Sí:** `GamesSummary` recibe además `activeId` (resalta la fila de la pestaña activa) y `loading` (skeleton en las celdas de datos mientras el Salón carga). Decidido durante la implementación.

## Riesgos

| Riesgo                                                                                | Mitigación                                                                                                                                                            |
| ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cualquiera con la publishable key puede insertar puntuaciones falsas                  | Los constraints limitan nombre, juego y rango del score. No hay `UPDATE` ni `DELETE`. Anti-trampas y auth quedan para otras specs.                                    |
| Con más de 1000 filas, `limit 1000` deja fuera puntuaciones y PARTIDAS se queda corto | La consulta ordena por puntuación, así que los mejores entran. El volumen esperado del curso está muy por debajo. Si se supera, pasar a RPC (decisión ya registrada). |
| Supabase limita las respuestas a 1000 filas por defecto                               | Coincide con el `limit` elegido. No se pide más.                                                                                                                      |
| "TU MEJOR MARCA" confunde a dos jugadores con el mismo nombre                         | Aceptado hasta la spec de auth. Sin auth el nombre es la única identidad.                                                                                             |
| Strict Mode duplica la petición o aplica un resultado tras desmontar                  | El efecto ignora la respuesta si el componente ya se desmontó.                                                                                                        |
| Leer Supabase rompe el prerender de `/salon`                                          | La lectura ocurre en `useEffect` con el cliente de navegador. `lib/supabase/server.ts` no se importa. Un criterio de aceptación lo comprueba.                         |
| Añadir un juego nuevo y olvidar el CHECK hace fallar su guardado                      | El fallo es visible ("ERROR AL GUARDAR"). La migración de `scores` comenta que la lista debe ir a la par con `GAMES`.                                                 |
| Variables de entorno ausentes hacen que `createClient` lance                          | El Salón lo trata como error ("SEÑAL PERDIDA") y el modal como "ERROR AL GUARDAR".                                                                                    |

## Lo que **no** entra en esta spec

- Supabase Auth y puntuaciones vinculadas a usuarios reales.
- Tabla `games` en la base de datos.
- Datos reales en el Detalle, la Home y en `best`/`plays` de las fichas.
- RPC, vistas SQL, Realtime y paginación.
- Anti-trampas, moderación y borrado de puntuaciones.
- Migración de `av_scores`.
- Tests automatizados.

Cada uno de estos puntos, si llega, va en su propia spec.
