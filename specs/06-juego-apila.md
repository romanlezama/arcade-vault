# SPEC 06 — Juego APILA: segundo juego real y registro de motores

> **Estado:** Aprobado
> **Depende de:** SPEC 04, SPEC 05
> **Fecha:** 2026-11-21
> **Objetivo:** Añadir la ficha APILA y ejecutar en `/juegos/apila/jugar` el juego de `references/started-games/03-tetris/`, portado a TypeScript dentro del CRT mediante un registro de motores, notificando a React la puntuación, el nivel y el estado, y guardando en el leaderboard real.

## Por qué existe esta spec

`references/started-games/03-tetris/` es un juego de piezas que caen, completo en canvas: `game.js` (332 líneas, sin dependencias), `index.html` y `style.css`. No puede vivir en Next.js tal cual, por cuatro motivos:

- Usa globales de módulo y `document.getElementById` para 10 elementos del DOM.
- Pinta en el DOM un panel lateral (SCORE, LINES, LEVEL, la siguiente pieza en un segundo `<canvas>`, la lista de controles) y un overlay HTML compartido por PAUSA y GAME OVER, con un botón "Reiniciar".
- Registra un `keydown` en `document` que nunca se retira.
- Lee `getComputedStyle(document.body)` en cada frame para el color de la rejilla, y tiene un toggle de tema claro/oscuro que se guarda en `localStorage` (`tetris-theme`).

Además, su tablero mide 300×600, que no es 4:3. El juego trae una 8.ª pieza no estándar, la "tuerca" (un anillo 3×3), que el README no menciona.

Esta spec lo porta con el contrato de SPEC 04 como una ficha nueva, APILA, y deja CAÍDA como juego simulado. Es el segundo juego real, así que generaliza `GamePlayer` a un registro de motores, como dejó decidido SPEC 04.

## Alcance

**Entra:**

- Nueva ficha en `GAMES` (`lib/games.ts`), en 10.ª posición: `id: "apila"`, título "APILA", categoría PUZZLE, color `yellow`. Portada nueva `cover-apila` en `app/globals.css`.
- Stat de la Home: "9" pasa a "10" (`HOME_STATS` en `lib/home.ts`).
- Migración `supabase/migrations/<timestamp>_scores_game_apila.sql` que añade `'apila'` a `scores_game_id_check`.
- Registro de motores en `games/types.ts` + `games/registry.ts`. `GamePlayer` deja de usar `isAsteroides`. ASTEROIDES pasa por el registro sin cambios de comportamiento.
- Motor portado en `games/apila/engine.ts`, sin React ni globales:
  - Misma jugabilidad que la referencia:
    - Tablero de 10×20.
    - 8 piezas: I, O, T, S, Z, J, L y la tuerca N, elegidas al azar con la misma probabilidad (`Math.floor(Math.random() * 8) + 1`).
    - Las piezas aparecen en `x = floor(COLS/2) − floor(ancho/2)`, `y = 0`.
    - Rotación horaria (`rotateCW`) con wall kicks `[0, −1, 1, −2, 2]`.
    - Movimiento lateral, soft drop y hard drop.
    - Pieza fantasma.
    - Vista previa de la siguiente pieza.
    - Limpieza de líneas de abajo arriba.
    - GAME OVER cuando la pieza recién generada colisiona.
  - Puntos:
    - Líneas: `LINE_SCORES = [0, 100, 300, 500, 800]` × nivel. El nivel es el de antes de sumar las líneas nuevas.
    - Soft drop: +1 por fila bajada.
    - Hard drop: +2 por celda recorrida.
  - Nivel: `floor(lines / 10) + 1`. Velocidad de caída: `max(100, 1000 − (level − 1) × 90)` ms.
  - HUD dibujado en el canvas: panel izquierdo con SCORE, LINES y LEVEL. Panel derecho con NEXT (la siguiente pieza) y CONTROLES.
  - El panel lateral y la vista previa, que en la referencia eran DOM y un segundo `<canvas>`, se dibujan dentro del canvas único.
  - Estado inicial `ready`: "APILA" y "PULSA ESPACIO PARA EMPEZAR".
  - GAME OVER dentro del canvas, en lugar del overlay HTML: "GAME OVER" y "PUNTAJE: N — ESPACIO PARA REINICIAR". Espacio reinicia a `playing`.
  - Pausa en el motor: `P` y `Escape`, `pause()`/`resume()` y `visibilitychange`.
  - Paleta neón del vault.
  - `onChange(snapshot)` solo cuando cambia el snapshot.
  - `destroy()` cancela el rAF y retira todos los listeners.
- Componente cliente `games/apila/canvas.tsx` con `pause`/`resume`/`reset` por `ref`.
- Integración en `components/game-player.tsx` vía registro:
  - El HUD muestra los valores del snapshot. Vidas muestra "—".
  - PAUSA/REANUDAR, FIN y GUARDAR PUNTUACIÓN en `public.scores` con `game_id = "apila"`.
  - JUGAR DE NUEVO llama a `reset()`.

**Fuera de alcance (para specs futuras):**

- El toggle de tema claro/oscuro de la referencia y su clave `tetris-theme` en `localStorage`.
- El botón HTML "Reiniciar" del overlay (lo sustituye Espacio).
- Mecánicas que no están en la referencia: hold, bolsa de 7 piezas, lock delay, T-spins, combos, sonido, auto-repeat propio (DAS/ARR).
- Cambiar o retirar la ficha CAÍDA, que sigue simulada.
- Mostrar las líneas en el HUD de la plataforma (solo se ven en el canvas).
- Datos reales en el aside "MEJORES PUNTUACIONES" del Detalle (sigue con `seededScores`, `app/juegos/[id]/page.tsx`).
- Datos reales en la Home y en `best`/`plays` de las fichas.
- Controles táctiles o gamepad virtual.
- Abrir el modal "FIN DEL JUEGO" automáticamente al GAME OVER.
- Etiquetas fijas del Detalle ("TECLADO / TÁCTIL", "RETRO 1985", dificultad).
- Anti-trampas y validación de la puntuación en servidor.
- Tests automatizados.
- Ajuste por `devicePixelRatio`.

## Modelo de datos

```ts
// lib/games.ts — se amplía la unión y se añade la ficha al final de GAMES
export type CoverClass = /* …las 9 actuales… */ | "cover-apila";

{
  id: "apila",
  title: "APILA",
  short: "Encaja ocho piezas, incluida la tuerca imposible.",
  long: "Las piezas caen sobre un pozo de diez columnas: muévelas, gíralas y suéltalas de golpe para completar líneas. Entre las clásicas se cuela la tuerca, un anillo hueco que pondrá a prueba tu orden. Cada 10 líneas la caída se acelera.",
  cat: "PUZZLE",
  cover: "cover-apila",
  color: "yellow",
  best: 96300,
  plays: "0.8K",
}
```

```sql
-- supabase/migrations/<timestamp>_scores_game_apila.sql
-- SPEC 06 — APILA: añade 'apila' a los juegos admitidos en scores.
-- Debe ir a la par con GAMES (lib/games.ts).
alter table public.scores drop constraint scores_game_id_check;
alter table public.scores add constraint scores_game_id_check check (game_id in (
  'bloque-buster', 'caida', 'serpentina', 'gloton', 'invasores',
  'rocas', 'ranaria', 'duelo-pixel', 'asteroides', 'apila'
));
```

```ts
// games/types.ts
export type GameSnapshot = {
  status: string; // cada motor usa su propia unión
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

// games/registry.ts
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
  apila: {
    Canvas: ApilaCanvas,
    initialSnapshot: {
      status: "ready",
      paused: false,
      score: 0,
      lives: 0,
      level: 1,
    },
  },
};
```

```ts
// games/apila/engine.ts — sin "use client", sin imports de React
export type ApilaStatus = "ready" | "playing" | "gameover";

export type ApilaSnapshot = {
  status: ApilaStatus;
  paused: boolean;
  score: number;
  lives: number; // siempre 0: el juego no tiene vidas y el HUD muestra "—"
  level: number; // floor(lines / 10) + 1
};

export type ApilaEngine = {
  pause(): void; // solo tiene efecto en playing
  resume(): void;
  reset(): void; // vuelve a ready: tablero vacío, score 0, lines 0, nivel 1
  destroy(): void; // cancela el rAF y retira los listeners de window/document
};

export function createApilaEngine(
  canvas: HTMLCanvasElement,
  onChange: (snapshot: ApilaSnapshot) => void,
): ApilaEngine;

// Estado interno en el closure: board: number[][] (ROWS×COLS, 0 = vacío, 1–8 = tipo),
// current/next: { type: number; shape: number[][]; x: number; y: number },
// score, lines, level, dropInterval, dropAccum, lastTime, status, paused.
```

```ts
// games/apila/canvas.tsx — "use client"
export type ApilaHandle = Pick<ApilaEngine, "pause" | "resume" | "reset">;
export function ApilaCanvas(props: {
  ref?: React.Ref<ApilaHandle>;
  onChange: (snapshot: ApilaSnapshot) => void;
}): React.JSX.Element;
```

Convenciones:

- La lógica trabaja en 800×600 y el canvas se escala por CSS dentro de `.crt-screen`. Distribución:
  - Tablero de 300×600 en `x = 250`, con `BLOCK = 30`.
  - Panel izquierdo de 250 px: SCORE, LINES, LEVEL.
  - Panel derecho de 250 px: NEXT, en una caja de 4×4 celdas de 30 px centrada como en `drawNext`, y CONTROLES (`← →` mover, `↑ X` rotar, `↓` bajar, `ESPACIO` caída, `P ESC` pausa).
- Constantes de la referencia con los mismos valores: `COLS = 10`, `ROWS = 20`, `BLOCK = 30`, `PIECES` (las 8 matrices tal cual), `LINE_SCORES = [0, 100, 300, 500, 800]`, `dropInterval` inicial 1000 ms, mínimo 100 ms, −90 ms por nivel, kicks `[0, −1, 1, −2, 2]`, fantasma con `globalAlpha = 0.2`, celda dibujada con 1 px de margen y franja de brillo de 4 px a `rgba(255,255,255,0.12)`.
- Auto-drop: igual que la referencia. Cuando `dropAccum >= dropInterval`, `dropAccum = 0` y la pieza baja una fila, o se bloquea si no puede bajar. `dt` se limita a 50 ms.
- Paleta (constantes en `engine.ts` con los valores de los tokens de `app/globals.css`), con glow vía `shadowBlur` en las piezas fijas y en la actual (no en el fantasma):
  - I `--cyan`, O `--yellow`, T `--magenta`, S `--green`.
  - Z `--bronze`, J `--ink`, L `--gold`, N (tuerca) `--silver`.
  - Rejilla: `--ink-faint` con `lineWidth = 0.5`. Fondo del tablero `--bg` con borde `--line`.
  - Etiquetas de los paneles: `--ink-dim`. Valores: `--yellow`.
  - Textos de los overlays en el canvas: `--ink`. "GAME OVER" en `--magenta`.
- Input: `keydown` en `window`. Se ignoran eventos cuyo `target` sea `input`, `textarea` o `contentEditable`. `preventDefault()` en `ArrowLeft`, `ArrowRight`, `ArrowDown`, `ArrowUp`, `KeyX`, `Space`, `KeyP` y `Escape`. La repetición de tecla es la nativa del navegador, como en la referencia. No hay `keyup`.
- En `ready` y `gameover`, Espacio solo arranca o reinicia la partida, sin hacer hard drop. En `playing` (sin pausa), Espacio hace hard drop.
- `P` y `Escape` alternan la pausa solo en `playing`. Con `paused: true` el loop dibuja el último frame sin `update` y las teclas de juego no actúan. Al reanudar se reinicia `lastTime`, así que `dt` no acumula.
- `lives` del snapshot vale siempre 0, y el HUD de la plataforma muestra "—". `level` es el nivel del juego.
- `onChange` se llama al crear con (`ready`, 0, 0, 1, `paused: false`).
- El motor no lee `getComputedStyle` ni `localStorage`.
- Números en el canvas con `toLocaleString("es-ES")`, igual que el HUD de la plataforma.

## Plan de implementación

Cada paso deja el sistema funcionando y termina con su **Prueba manual**.

1. **Registro de motores.**
   - Crear `games/types.ts` y `games/registry.ts` con la entrada `asteroides`.
   - En `components/game-player.tsx`:
     - `const entry = GAME_REGISTRY[game.id]` sustituye a `isAsteroides`, y `const isReal = Boolean(entry)`.
     - El estado `snapshot` se inicializa con `entry.initialSnapshot`, y la ref pasa a `useRef<GameHandle>(null)`.
     - `togglePause`, `finish` y `restart` usan la ref genérica.
     - `<entry.Canvas ref={handleRef} onChange={setSnapshot} />` se monta en `.crt-screen`.
     - Se eliminan `INITIAL_ASTEROIDES` y los imports directos de `games/asteroides`.
   - Si `AsteroidesCanvas` no encaja con `GameCanvasProps` por la varianza de `ref`/`onChange`, se ajusta el tipado del registro sin cambiar el motor.
   - Prueba manual: ASTEROIDES se juega igual que antes (ready, pausa, FIN, guardar, JUGAR DE NUEVO), `/juegos/caida/jugar` sigue simulado, y `npx tsc --noEmit` y `npm run lint` pasan.
2. **Ficha y portada.**
   - Añadir `"cover-apila"` a `CoverClass` y la ficha APILA al final de `GAMES`.
   - Añadir `.cover-apila` en `app/globals.css`, junto a las demás portadas, diseñada con `/frontend-design`:
     - Un pozo con piezas neón apiladas y la tuerca (anillo 3×3) en lugar destacado.
     - Debe distinguirse a simple vista de `.cover-tetro`.
   - Cambiar el stat de `lib/home.ts` de "9" a "10".
   - Prueba manual: `/biblioteca` muestra 10 tarjetas, `/juegos/apila` muestra el Detalle y `/juegos/apila/jugar` abre la partida simulada.
3. **Migración del CHECK.**
   - `npx supabase migration new scores_game_apila` con el SQL del modelo de datos.
   - `npm run db:push` y `npm run db:types`.
   - Prueba manual: `npx supabase migration list --remote` la muestra en Local y Remote. Un insert con `'apila'` funciona y uno con `'pong'` sigue fallando.
4. **Port del motor (jugabilidad).**
   - Crear `games/apila/engine.ts` con `PIECES`, `createBoard`, `randomPiece`, `collide`, `rotateCW`, `tryRotate`, `merge`, `clearLines`, `ghostY`, `softDrop`, `hardDrop`, `lockPiece` y `spawn` portadas a TS con tipos explícitos.
   - Dibujar el tablero, el fantasma y la pieza actual, y los paneles izquierdo y derecho (NEXT y CONTROLES) en el canvas de 800×600.
   - El estado vive en el closure de `createApilaEngine`. No se accede a `window` ni a `document` al importar.
   - Prueba manual: `npx tsc --noEmit` y `npm run lint` pasan.
5. **Ciclo de vida, estados e input.**
   - Añadir el estado `ready` con su overlay.
   - Añadir el GAME OVER en canvas y el reinicio con Espacio.
   - Añadir la pausa (`P`, `Escape`, `visibilitychange`, `pause()`/`resume()`) y `reset()`.
   - Añadir `destroy()`, el limitador de `dt` a 50 ms y el input con `preventDefault` que ignora campos de texto.
   - Emitir `onChange` solo cuando cambia algún campo del snapshot.
   - Prueba manual: `npx tsc --noEmit` pasa.
6. **Componente canvas.**
   - Crear `games/apila/canvas.tsx` copiando el patrón de `games/asteroides/canvas.tsx`, con `<canvas width={800} height={600}>`.
   - Prueba manual: `npx tsc --noEmit` y `npm run lint` pasan.
7. **Integración en el reproductor.**
   - Añadir la entrada `apila` a `GAME_REGISTRY`.
   - Prueba manual:
     - En `/juegos/apila/jugar` se ve "PULSA ESPACIO PARA EMPEZAR".
     - Espacio arranca la partida, y completar una línea en nivel 1 suma 100 en el canvas y en el HUD.
     - FIN abre el modal con esa puntuación, y GUARDAR crea una fila en `public.scores` con `game_id = 'apila'`.
8. **Paleta neón.**
   - Aplicar los colores por rol de las convenciones, con glow.
   - Prueba manual: cada tipo de pieza tiene su color, y la tuerca es plateada.

## Criterios de aceptación

- [ ] `npm run build`, `npm run lint` y `npx tsc --noEmit` terminan sin errores.
- [ ] `/juegos/apila` y `/juegos/apila/jugar` se prerenderizan como las demás rutas de `/juegos/[id]`, y `/salon` sigue siendo estática.
- [ ] `/biblioteca` muestra 10 tarjetas. APILA es la última y aparece con el filtro PUZZLE junto a CAÍDA.
- [ ] La portada `cover-apila` se ve en la tarjeta y en el Detalle, y no es idéntica a `cover-tetro` ni a ninguna otra.
- [ ] El primer stat de la Home dice "10" / "JUEGOS" / "Y CONTANDO", y el rail sigue mostrando los mismos 6 juegos.
- [ ] El Salón de la Fama muestra una pestaña APILA, y "TODOS LOS JUEGOS" tiene 10 filas.
- [ ] `npx supabase migration list --remote` muestra la migración `scores_game_apila` aplicada en Local y Remote, y un insert con un `game_id` fuera de la lista sigue fallando.
- [ ] Al abrir `/juegos/apila/jugar`, el canvas muestra "APILA" y "PULSA ESPACIO PARA EMPEZAR". Ninguna pieza cae, la puntuación del HUD es 0 y Vidas muestra "—".
- [ ] El canvas muestra el tablero centrado, SCORE/LINES/LEVEL a la izquierda, y NEXT con la siguiente pieza y la lista de controles a la derecha.
- [ ] Tras pulsar Espacio:
  - `←` y `→` mueven la pieza.
  - `↑` y `X` la rotan en sentido horario.
  - `↓` la baja una fila.
  - Espacio la deja caer de golpe.
  - La pieza fantasma marca dónde aterrizará.
- [ ] Pulsar Espacio para empezar no hace hard drop de la primera pieza.
- [ ] Una pieza pegada a la pared rota si un desplazamiento de ±1 o ±2 columnas lo permite.
- [ ] Durante una partida aparece la tuerca (anillo 3×3 plateado).
- [ ] Pulsar flechas, Espacio, `X`, `P` o `Escape` no hace scroll de la página.
- [ ] Puntuación:
  - Limpiar 1, 2, 3 o 4 líneas suma 100, 300, 500 u 800 × nivel.
  - `↓` suma 1 por fila.
  - El hard drop suma 2 por celda recorrida.
  - La puntuación del HUD de la plataforma coincide con la del canvas.
- [ ] Al llegar a 10 líneas, el nivel pasa a 2 en el canvas y en el HUD de la plataforma, y la caída automática es más rápida.
- [ ] Cuando una pieza nueva no cabe al aparecer, el canvas muestra "GAME OVER" con la puntuación y el modal no se abre solo. Espacio inicia una partida nueva con el tablero vacío, 0 puntos, 0 líneas y nivel 1.
- [ ] `P`, `Escape` y el botón PAUSA pausan y muestran "EN PAUSA", y la pieza deja de caer. Repetirlos (o REANUDAR) reanuda sin que la pieza salte filas.
- [ ] Cambiar de pestaña durante la partida la deja en pausa al volver.
- [ ] FIN pausa el motor y abre "FIN DEL JUEGO" con la puntuación actual, o con la final si ya hubo GAME OVER.
- [ ] En el modal se pueden escribir iniciales con espacios sin que la pieza caiga ni la página haga scroll.
- [ ] GUARDAR PUNTUACIÓN crea exactamente una fila en `public.scores` con `game_id = 'apila'`, el nombre del input y la puntuación mostrada.
- [ ] Tras guardar, `/salon` muestra la puntuación en la pestaña APILA y en la fila APILA de "TODOS LOS JUEGOS".
- [ ] JUGAR DE NUEVO cierra el modal y deja el canvas en "PULSA ESPACIO PARA EMPEZAR" con 0 puntos, 0 líneas y nivel 1.
- [ ] Al salir con SALIR y volver a entrar solo hay un loop activo: la caída va a la velocidad normal y la consola no muestra errores.
- [ ] Colores de las piezas: I cyan, O amarilla, T magenta, S verde, Z bronce, J tinta clara, L dorada y tuerca plateada.
- [ ] `components/game-player.tsx` no contiene `isAsteroides`.
- [ ] ASTEROIDES, CAÍDA y el resto de juegos se comportan exactamente igual que antes.

## Decisiones

- **Sí:** ficha nueva APILA (`id: "apila"`), al final de `GAMES`. Es lo que eligió el usuario. Al ir al final no altera el rail de la Home.
- **No:** sustituir la ficha CAÍDA. CAÍDA sigue como juego simulado, igual que ROCAS frente a ASTEROIDES.
- **Sí:** título "APILA". Describe la mecánica y evita el nombre comercial del juego original.
- **Sí:** categoría PUZZLE y color `yellow`. Mismo género que CAÍDA, con un color que la diferencia en el filtro PUZZLE.
- **Sí:** portada propia `cover-apila` con la tuerca. Dos portadas parecidas confundirían en la Biblioteca.
- **Sí:** stat de la Home a "10". La Home no debe contar mal los juegos (mismo criterio que en SPEC 02 y SPEC 04).
- **Sí:** migración nueva para el CHECK. **No:** quitar el CHECK (SPEC 05 lo decidió para bloquear ids inexistentes).
- **Sí:** registro de motores ahora que hay dos juegos reales, como primer paso del plan. **No:** encadenar `game.id === …` en `GamePlayer`.
- **Sí:** conservar las 8 piezas, incluida la tuerca, con la misma probabilidad que en `game.js`. Es parte del juego aunque el README no la mencione.
- **No:** quedarse solo con las 7 piezas estándar.
- **Sí:** conservar todo lo jugable (wall kicks, soft drop y hard drop, fantasma, vista previa, niveles cada 10 líneas) y todas las constantes con sus valores.
- **No:** el toggle de tema claro/oscuro ni `localStorage`. La plataforma tiene su propio tema y el motor no persiste nada.
- **No:** el botón HTML "Reiniciar". Espacio reinicia, como en ASTEROIDES.
- **Sí:** lienzo de 800×600 con el tablero de 300×600 centrado y los paneles dibujados en el canvas. Encaja en el 4:3 de `.crt-screen` sin cambiar `BLOCK`, y lleva al canvas toda la UI que la referencia tenía en el DOM.
- **No:** escalar el tablero solo con bandas negras. Se perderían el marcador, NEXT y los controles.
- **Sí:** `lives = 0`, que el HUD de la plataforma ya muestra como "—". El juego no tiene vidas y "—" lo deja claro.
- **No:** 1 vida fija. Sugeriría una mecánica que no existe.
- **Sí:** las líneas solo se ven en el canvas. El snapshot se queda con los campos del contrato.
- **Sí:** paleta neón con los tokens del vault, un color por tipo de pieza. Coherente con la plataforma y con ASTEROIDES.
- **No:** los colores material originales de `COLORS`.
- **Sí:** se mantienen todos los defaults de SPEC 04: estado `ready`, GAME OVER en el canvas con Espacio, pausa en el motor (se añade `Escape` a la `P` original), HUD doble y modal solo con FIN.
- **Sí:** FIN congela la puntuación y JUGAR DE NUEVO llama a `reset()`, igual que en SPEC 04.
- **Sí:** repetición de tecla nativa del navegador, como en la referencia. **No:** DAS/ARR propios (mecánica nueva).
- **Sí:** `dt` limitado a 50 ms aunque la referencia no lo limitaba. Lo exige el contrato y evita caídas en ráfaga tras un parón.
- **Sí:** portar a TypeScript con `createApilaEngine(canvas, onChange)` en `games/apila/`. Mismo patrón que ASTEROIDES (SPEC 04).
- **No:** iframe o `<Script>` con el `game.js` original. Deja globales y listeners imposibles de limpiar, y la puntuación exigiría `postMessage`.
- **Sí:** la puntuación se guarda en `public.scores` con el flujo de SPEC 05. El motor no conoce Supabase.
- **Sí:** los textos `short`/`long` y los `best`/`plays` de la ficha los redacta la spec, y el usuario los ajusta al revisar.

## Riesgos

| Riesgo                                                            | Mitigación                                                                                                                 |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Generalizar `GamePlayer` rompe ASTEROIDES                         | Paso 1 propio, con prueba manual de ASTEROIDES antes de portar APILA.                                                      |
| Los tipos de `AsteroidesCanvas` no encajan con `GameCanvasProps`  | `ApilaSnapshot` y `AsteroidesSnapshot` cumplen `GameSnapshot`. Si hace falta, se ajusta el tipo del registro, no el motor. |
| Olvidar el CHECK hace fallar el guardado                          | La migración va en el paso 3, antes de la integración. El fallo es visible ("ERROR AL GUARDAR").                           |
| El Espacio que arranca la partida hace también hard drop          | En `ready`/`gameover` Espacio solo cambia de estado. Hay un criterio de aceptación que lo comprueba.                       |
| La repetición de tecla mueve o rota la pieza durante la pausa     | Las teclas de juego se ignoran con `paused: true`.                                                                         |
| Strict Mode monta dos veces y deja dos loops                      | El motor se crea en `useEffect` con `destroy()` en el cleanup. Hay un criterio de un solo loop.                            |
| Los listeners capturan teclas mientras se escriben iniciales      | Se ignoran `input`/`textarea`/`contentEditable`, y el motor está pausado con el modal abierto.                             |
| El motor toca `window` al importarse y rompe el prerender         | Solo se accede dentro de `createApilaEngine`, que se llama en `useEffect`.                                                 |
| `onChange` en cada frame provoca 60 renders/s                     | Se compara con el último snapshot emitido.                                                                                 |
| La tuerca (3×3 hueca) no cabe al aparecer y adelanta el GAME OVER | Es el comportamiento de la referencia y se conserva.                                                                       |
| El glow (`shadowBlur`) en 200 celdas por frame baja los FPS       | Glow solo en las celdas ocupadas. Si cae el rendimiento, se reduce `shadowBlur` en las piezas fijas.                       |
| Canvas escalado borroso en pantallas grandes                      | Aceptable por el estilo retro. `devicePixelRatio` irá en otra spec.                                                        |

## Lo que **no** entra en esta spec

- Toggle de tema, `localStorage` y el botón HTML "Reiniciar" de la referencia.
- Hold, bolsa de 7, lock delay, T-spins, combos, sonido y DAS/ARR.
- Cambios en la ficha CAÍDA.
- Líneas en el HUD de la plataforma.
- Datos reales en el Detalle, en la Home y en `best`/`plays`.
- Controles táctiles y gamepad virtual.
- Modal automático al GAME OVER.
- Etiquetas del Detalle por juego.
- Anti-trampas, tests automatizados y `devicePixelRatio`.

Cada uno de estos puntos, si llega, va en su propia spec.
