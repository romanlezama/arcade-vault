# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

Arcade Vault is an online platform for playing retro arcade games and competing for the highest score. The UI is a neon/retro portal (Spanish copy) with a home landing, a game library, game detail pages, a play screen, a hall of fame and a mock login. Scores are stored in Supabase; three games have real engines and the rest still run a simulated match.

Development follows **Spec Driven Design** with the `/spec` (write a spec) and `/spec-impl` (implement a spec) skills from [Klerith/fernando-skills](https://github.com/Klerith/fernando-skills). Specs live in `specs/NN-<name>.md`, are written in Spanish and carry a status header (`Borrador` → `Aprobado` → `Implementado`). `/spec-impl` only runs on approved specs and creates a `spec-NN-<name>` branch; work is merged to `main` through PRs.

| Spec | Feature                                                     |
| ---- | ----------------------------------------------------------- |
| 01   | MVP visual screens: library, navigation, mock auth          |
| 02   | Home landing; library moved to `/biblioteca`                |
| 03   | Supabase foundations (clients, env, `/api/health`)          |
| 04   | ASTEROIDES — first real game engine                         |
| 05   | Real leaderboard on Supabase (`scores` table, hall of fame) |
| 06   | APILA (falling-block puzzle) + engine registry              |
| 07   | VÍBORA (snake)                                              |
| 08   | ASTEROIDES skins (clásico/neón/retro) + skin contract       |
| 09   | Touch controls: virtual gamepad + mobile player layout      |

When adding a feature, write or update a spec first and implement from it. The README and specs are in Spanish.

## Commands

```bash
npm run dev       # next dev (Turbopack), http://localhost:3000
npm run build     # production build; also type-checks
npm run start     # serve the production build
npm run lint      # ESLint 9 flat config (next core-web-vitals + typescript)
npm run format    # prettier --write .
npx tsc --noEmit  # type-check only
npm run db:push   # apply supabase/migrations to the remote Supabase project (CLI v3, --remote)
npm run db:types  # regenerate lib/database.types.ts from the remote schema; run after db:push
```

No test framework is configured yet. Verify UI changes in the browser (Playwright MCP); save screenshots in `.playwright-screenshots/`.

## Architecture

### Routes (`app/`)

- `/` home landing (`lib/home.ts` content, `components/floating-silhouettes.tsx`, `reveal-observer.tsx`).
- `/biblioteca` library with search and category filter (`components/library.tsx`, `game-card.tsx`).
- `/juegos/[id]` game detail; `/juegos/[id]/jugar` play screen (`components/game-player.tsx`). Both use `generateStaticParams` over `GAMES`. The detail page's leaderboard still uses deterministic fake data (`lib/scores.ts` → `seededScores`).
- `/salon` hall of fame (`components/hall-of-fame.tsx`): real Supabase scores, per-game top 10 and summary.
- `/login` mock auth (`components/auth-form.tsx`). Session is client-only: `lib/session.ts` stores `{ name }` in `localStorage` (`av_user`) and exposes `useUser()` via `useSyncExternalStore` (always `null` on the server/first render), `signIn`, `signOut`.
- `GET /api/health` calls the SQL function `public.health()` to check the Supabase connection.

### Game catalog and engines

- `lib/games.ts`: `GAMES` is the single source of truth for the catalog (id/slug, title, texts, category, `cover` CSS class, button color, display `best`/`plays`). `CoverClass` lists the cover classes defined in `app/globals.css`.
- Real games live in `games/<id>/`: `engine.ts` (framework-free canvas engine: `createXEngine(canvas, onChange)` returning `pause/resume/reset/destroy`) and `canvas.tsx` (client component that creates the engine on mount, destroys it on unmount and exposes the handle via `ref` as a prop, React 19 style).
- `games/types.ts` is the shared contract (`GameSnapshot` = status/paused/score/lives/level, `GameHandle`, `GameCanvasProps`). `games/registry.ts` maps game id → `{ Canvas, initialSnapshot }`.
- `GamePlayer` looks the game up in `GAME_REGISTRY`: if present, the engine is the source of truth (HUD, pause, game over); otherwise it runs the simulated score. On game over the "FIN DEL JUEGO" modal saves the score with `insertScore`.
- Current real games: `asteroides`, `apila`, `vibora`. Reference sources to port are in `references/started-games/` (and art in `references/source-assets/`); never import from `references/` (see `/home/roman/lkf/CursoClaudeCode/05-arcade-vault/references/implemented-games.md`).

### Supabase and scores

- Typed clients in `lib/supabase/` (`client.ts` for the browser, `server.ts` for server code, both `createClient`), typed with `lib/database.types.ts` (generated — don't hand-edit).
- Table `public.scores` (`game_id`, `player_name`, `score`, `created_at`): RLS with public anonymous select/insert, no update/delete. Constraints: name 1–10 chars uppercase, score 0–10,000,000, and a `scores_game_id_check` CHECK listing every game id.
- **Adding a game to `GAMES` requires a new migration** that drops and re-creates `scores_game_id_check` with the full id list (see `supabase/migrations/*_scores_game_*.sql`), then `npm run db:push` and `npm run db:types`.
- `lib/scores-db.ts`: browser-side `fetchScores()` (top 1000) and `insertScore()`. `lib/leaderboard.ts`: pure ranking functions (best score per player, ties broken by oldest `created_at`, `normalizePlayerName`, `summarizeGames`).
- Env vars in `.env.local` (template `.env.example`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`). Only the publishable key, never `service_role`. No local Docker stack — CLI commands need `--remote`. The Supabase MCP server is configured in `.mcp.json`.

## Stack and non-default configuration

- **Next.js 16.4 (App Router only), React 19.3, TypeScript strict.** Next.js APIs differ from older versions; check `node_modules/next/dist/docs/` (`01-app/` for App Router) before using any Next API.
- **`cacheComponents: true` + `partialPrefetching: true`** (`next.config.ts`): data fetching is dynamic by default and caching is opt-in via the `use cache` directive with `cacheLife` / `cacheTag`. Uncached dynamic data must sit inside a `<Suspense>` boundary so the static shell can prerender (route handlers use `await connection()` to opt out of prerendering). Do not add `runtime` route segment exports (unsupported with Cache Components), and don't use legacy `export const revalidate`/`dynamic` patterns without checking the docs (`01-app/guides/migrating-to-cache-components.md`).
- **`experimental.agentFeedback: true`**: `next dev` rewrites the managed block in `AGENTS.md`; commit that block rather than reverting it.
- **Tailwind CSS v4** is loaded through a custom Turbopack loader rule (`@tailwindcss/turbopack` for `*.css`), not PostCSS — there is no `postcss.config` or `tailwind.config`. It is imported **without preflight** (only `theme` and `utilities` layers). `app/globals.css` is the retro theme ported from `references/resources/templates/`: tokens on `:root` exposed via `@theme inline` (`bg-bg`, `text-cyan`, `font-pixel`…), plus the `av-*` component classes and the `cover-*` game covers. Dark-only neon palette.
- Fonts via `next/font/google` in `app/layout.tsx`: Press Start 2P (`--pixel`), JetBrains Mono and Courier Prime.
- Typed route helpers like `LayoutProps<"/">` / `PageProps<...>` are global types generated by Next (see `next-env.d.ts`, `.next/types`).
- Import alias: `@/*` maps to the repo root.

## Claude Code setup

- **PostToolUse hook** (`.claude/settings.local.json` → `.claude/hooks/format-and-lint.sh`): after every Write/Edit it runs Prettier and `eslint --fix` on the file, with an extra rule that **removes all blank lines** in JS/TS. If ESLint can't fix something, the hook fails and returns the errors — fix them before continuing. Don't fight the formatting it applies.
- Prettier config in `.prettierrc`; `.prettierignore` skips `references/`, screenshots and build output.

## Skills

- Usa siempre `/frontend-design` para diseñar la interfaz de usuario.
- `/spec <descripción>` escribe una spec nueva en `specs/`; `/spec-impl <NN-nombre>` implementa una spec aprobada paso a paso.
- Para añadir un juego real (desde `references/started-games/` o un diseño propio) usa `/add-game <carpeta>`: genera una spec `specs/NN-juego-<id>.md` con motor, canvas, ficha en `GAMES`, portada, entrada en `GAME_REGISTRY`, migración del CHECK y leaderboard, siguiendo SPEC 04–07. Sus archivos de apoyo (`contrato-motor.md`, `checklist-integracion.md`, `plantilla-spec-juego.md`) están en `.claude/skills/add-game/`. Después se implementa con `/spec-impl`.

## Agentes

- **`game-planner`** (`.claude/agents/game-planner.md`): planifica y decide qué juego encaja como siguiente juego real de la plataforma. Úsalo antes de `/add-game` cuando haya que elegir o priorizar un juego nuevo.
  - Lee el catálogo (`lib/games.ts`), `games/registry.ts`, `references/implemented-games.md`, `references/started-games/`, los assets, el contrato de `/add-game` y `specs/`.
  - Propone 1–3 candidatos originales (mecánica, controles, puntuación, fuente, esfuerzo S/M/L) y una recomendación final con el siguiente paso: `/add-game` → `/spec-impl`.
  - Registra cada sugerencia en `references/game-suggestions-todo.md` (Pendientes / En curso / Implementados / Descartados), una entrada por id, sin duplicar.
  - Mantiene memoria persistente local (`memory: local`) en `.claude/agent-memory-local/game-planner/`, ignorada por git, para no repetir ideas ni volver a proponer las descartadas.
  - Solo escribe en el ToDo y en su memoria; no modifica código, specs ni migraciones.
- **`game-jam`** (`.claude/agents/game-jam.md`): recibe un tema y diseña un juego original para la plataforma.
  - Genera `specs/game-jam/<game-id>/00-concepto.md` (pitch, bucle, controles, boceto, estética, preguntas abiertas) y `01-juego-<game-id>.md` (spec completa con el formato de SPEC 06/07), ambos en Borrador.
  - Decide de forma autónoma y deja las dudas en "Preguntas abiertas" del concepto.
  - Solo escribe en `specs/game-jam/<game-id>/`. Tras revisarla, la spec se mueve a `specs/NN-juego-<id>.md`, se aprueba y se implementa con `/spec-impl`.
- **`skin-designer`** (`.claude/agents/skin-designer.md`): da a un juego real sus skins mínimas `clasico` (default), `neon` y `retro`, legibles sobre fondo oscuro.
  - Trabaja sobre **un solo juego por invocación**, el que indique el usuario (`@skin-designer <id>`); sin id válido no escribe nada y lista los juegos con su estado.
  - Audita la paleta del motor, valida contraste WCAG (texto ≥ 4,5:1, elementos de juego ≥ 3:1) y escribe `specs/NN-skins-<id>.md` en Borrador; la primera spec define el contrato de skins (`games/skins.ts`, `setSkin`, selector en `GamePlayer`, `av_skin`).
  - Registra el estado de cada juego en `references/game-with-themes.md` (una fila por juego, sin duplicar).
  - Memoria local en `.claude/agent-memory-local/skin-designer/`. Solo escribe en su spec, el registro y su memoria; no modifica código. Después se implementa con `/spec-impl`.
