# Checklist de integración en la plataforma

Cada punto que toca un juego real nuevo. La spec incluye en **Alcance** y en el **Plan** solo los que apliquen, y deja el resto en "Fuera de alcance" cuando sea relevante decirlo.

## 1. Ficha en `GAMES` — `lib/games.ts`

- **Ficha sustituida** (el juego real reemplaza a una simulada equivalente): se conserva el `id` y la posición. Se pueden reescribir `title`, `short`, `long` y `cover` si el usuario lo pide. `best`/`plays` siguen como están (fuera de alcance).
- **Ficha nueva**: se añade al final de `GAMES` (no altera el rail de la Home, que toma los primeros). Se amplía la unión `CoverClass` con `"cover-<id>"`.

## 2. Portada — `app/globals.css`

- Ficha nueva: clase `.cover-<id>` junto a las demás portadas, diseñada con `/frontend-design`. Debe distinguirse a simple vista de las existentes (criterio de aceptación).
- Ficha sustituida: se mantiene la portada salvo que el usuario quiera rediseñarla.

## 3. Stat de la Home — `lib/home.ts` (`HOME_STATS`)

- Solo con ficha nueva: el primer stat ("N" / "JUEGOS" / "Y CONTANDO") sube en 1.

## 4. Registro de motores — `games/types.ts` + `games/registry.ts`

**Aplica la primera vez que entra un segundo juego real**, es decir, si `components/game-player.tsx` sigue usando `isAsteroides`. SPEC 04 lo dejó decidido: "Se generalizará cuando llegue el segundo". Va como **primer paso del plan**, antes de portar el motor, y debe dejar ASTEROIDES funcionando exactamente igual.

Forma propuesta (la spec puede ajustarla):

```ts
// games/types.ts
export type GameStatus = string; // cada motor usa su propia unión
export type GameSnapshot = {
  status: GameStatus;
  paused: boolean;
  score: number;
  lives: number;
  level: number;
};
export type GameHandle = { pause(): void; resume(): void; reset(): void };
export type GameCanvasProps = {
  ref?: React.Ref<GameHandle>;
  onChange: (snapshot: GameSnapshot) => void;
};

// games/registry.ts — "use client" no es necesario si solo reexporta componentes cliente
export type GameEntry = {
  Canvas: React.ComponentType<GameCanvasProps>;
  initialSnapshot: GameSnapshot;
};
export const GAME_REGISTRY: Partial<Record<string, GameEntry>> = {
  asteroides: {
    Canvas: AsteroidesCanvas,
    initialSnapshot: {
      status: "ready",
      paused: false,
      score: 0,
      lives: 3,
      level: 1,
    },
  },
};
```

En `GamePlayer`:

- `const entry = GAME_REGISTRY[game.id]` sustituye a `isAsteroides`; `const isReal = Boolean(entry)`.
- El estado `snapshot` se inicializa con `entry.initialSnapshot`; la ref es `useRef<GameHandle>(null)`.
- `togglePause`, `finish` y `restart` usan la ref genérica.
- `<entry.Canvas ref={handleRef} onChange={setSnapshot} />` en `.crt-screen`.
- Los juegos sin entrada siguen con la partida simulada sin cambios.

Prueba manual del paso: ASTEROIDES se juega igual (ready, pausa, FIN, guardar, JUGAR DE NUEVO) y `/juegos/caida/jugar` sigue simulado.

**Si el registro ya existe**: solo se añade la entrada del juego nuevo.

## 5. Motor y canvas — `games/<id>/`

Según `contrato-motor.md`. Pasos típicos del plan: port de jugabilidad → ciclo de vida, estados e input → componente canvas → entrada en el registro → paleta.

## 6. Assets — `public/games/<id>/`

- Solo si la referencia trae imágenes, spritesheets o sonidos.
- Se copian tal cual desde `references/started-games/<carpeta>/assets/`. Los metadatos de sprites en JS (p. ej. `spritesheet.js`) se portan a TS dentro de `games/<id>/`.
- Rutas absolutas desde la raíz (`/games/<id>/spritesheet.png`).

## 7. Migración del CHECK — `supabase/migrations/`

Solo si el `id` no está en `scores_game_id_check` (ficha nueva).

```bash
npx supabase migration new scores_game_<id_con_guiones_bajos>
```

```sql
-- SPEC NN — <TÍTULO>: añade '<id>' a los juegos admitidos en scores.
-- Debe ir a la par con GAMES (lib/games.ts).
alter table public.scores drop constraint scores_game_id_check;
alter table public.scores add constraint scores_game_id_check check (game_id in (
  <lista completa actual de ids>, '<id>'
));
```

Después: `npm run db:push`, `npm run db:types` (los tipos no cambian porque `game_id` es `text`, pero se regeneran para mantener el flujo) y `npx supabase migration list --remote`.

Va **antes** del paso de integración en `GamePlayer`, para que el primer guardado real no falle.

## 8. Leaderboard — sin cambios de código

- `insertScore` (`lib/scores-db.ts`) ya recibe `game.id`.
- El Salón (`components/hall-of-fame.tsx`) genera pestañas desde `GAMES` y calcula con `leaderboardFor`/`playerBestFor` (`lib/leaderboard.ts`).
- "TODOS LOS JUEGOS" (`components/games-summary.tsx`) usa `summarizeGames(records, GAMES)`.
- Solo se verifica en los criterios de aceptación: guardar crea la fila y aparece en el Salón.

## 9. Fuera de alcance por defecto

Salvo que el usuario pida lo contrario, la spec lista como fuera de alcance:

- Datos reales en el aside "MEJORES PUNTUACIONES" del Detalle (sigue con `seededScores`, `app/juegos/[id]/page.tsx`).
- Datos reales en la Home y en `best`/`plays` de las fichas.
- Controles táctiles o gamepad virtual.
- Abrir el modal "FIN DEL JUEGO" automáticamente al GAME OVER.
- Etiquetas fijas del Detalle ("TECLADO / TÁCTIL", "RETRO 1985", dificultad).
- Anti-trampas y validación de la puntuación en servidor.
- Tests automatizados.
- Ajuste por `devicePixelRatio`.
