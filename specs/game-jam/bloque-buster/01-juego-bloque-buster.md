# SPEC GAME JAM — Juego BLOQUE BUSTER: nave-paleta, núcleo de plasma y racha

> **Estado:** Borrador
> **Depende de:** SPEC 04, SPEC 05, SPEC 06, SPEC 07
> **Fecha:** 2026-11-22
> **Tema de la jam:** BLOQUE BUSTER (id `bloque-buster`)
> **Objetivo:** Convertir la ficha existente BLOQUE BUSTER en un juego real y ejecutar en `/juegos/bloque-buster/jugar` un rompe-bloques original, escrito en TypeScript dentro del CRT y registrado en `GAME_REGISTRY`, que notifica a React la puntuación, las vidas, el nivel y el estado, y guarda en el leaderboard real.

## Por qué existe esta spec

Es un juego original de game jam con el tema "BLOQUE BUSTER". A diferencia de SPEC 04, 06 y 07, **no añade una ficha**: `bloque-buster` ya está en `GAMES` (1.ª posición, ARCADE, `cyan`, portada `cover-bricks`) y hoy corre la partida simulada de `GamePlayer`. Es el primer juego real que **sustituye** a una ficha simulada: se conservan el `id`, la posición, los textos y la portada.

El diseño sale del texto `long` de la ficha: una "nave-paleta" que rebota un "núcleo de plasma" contra "muros de bloques cromáticos", con niveles que "reorganizan la grilla en patrones" y una "racha" que multiplica los puntos. Del género "romper ladrillos" se toma solo la mecánica (paleta, rebote, bloques). No se copia el nombre, los niveles, el arte ni el aspecto de ningún juego comercial.

Existe `references/started-games/04-arkanoid/` (`game.js` de 268 líneas, `levels.js` con 5 niveles, `assets/spritesheet-breakout.png`, `spritesheet.js` y dos `.mp3`). Esta spec **no la porta**, por tres motivos:

- Es una recreación de un juego comercial concreto (lo dice su nombre), y sus 5 niveles (parrilla completa, pirámide, ajedrez, filas con huecos, marco con cruz) son los patrones genéricos de ese juego. El tema pide un diseño propio.
- El spritesheet y los sonidos no tienen origen ni licencia documentados.
- El código no puede vivir en Next.js tal cual: `document.getElementById` y `new Audio()` al cargar el módulo, `keydown`/`keyup`/`mousemove`/`click` en `document` y `canvas` que nunca se retiran, sin `dt` limitado, sin estado `ready` y con el selector de nivel en la pausa.

Se usa solo como lectura para confirmar el encaje del género en 800×600. Las constantes, los patrones, los power-ups y el arte de esta spec son nuevos. Nunca se importa nada de `references/`.

El CHECK `scores_game_id_check` ya incluye `'bloque-buster'` desde la migración inicial (`20261121193937_scores.sql`) y sigue en la última (`20261122045422_scores_game_vibora.sql`), así que **no hace falta migración**. El registro de motores ya existe (SPEC 06): solo se añade una entrada.

## Alcance

**Entra:**

- La ficha `bloque-buster` (BLOQUE BUSTER) pasa de partida simulada a juego real. Se conservan `id`, posición (1.ª), `title`, `short`, `long`, `cat`, `color`, `best`, `plays` y la portada `cover-bricks`. `lib/games.ts` y `app/globals.css` no cambian.
- Stat de la Home: **sin cambios** ("11"), porque no hay ficha nueva.
- Migración: **ninguna**. `'bloque-buster'` ya está en `scores_game_id_check`.
- Motor nuevo en `games/bloque-buster/engine.ts`, sin React ni globales, con los patrones en `games/bloque-buster/levels.ts`:
  - Campo de juego de 768 px de ancho bajo una franja de HUD de 50 px, con paredes laterales y techo. El borde inferior está abierto.
  - Rejilla de 12×9 celdas de 60×22 px. Cada nivel carga uno de 6 patrones propios: EMBUDO, DIANA, CORAZÓN, RAYO, LA CÁMARA y ESPIRAL.
  - Tres tipos de bloque: normal (1 golpe, 4 colores), duro (2 golpes, el primero lo agrieta) y blindado (indestructible, no cuenta para completar el muro).
  - Nave-paleta de 96×14 que se mueve con `←`/`→` o `A`/`D` mantenidas, a 560 px/s.
  - Núcleo de plasma de radio 7. Descansa sobre la nave al empezar cada vida y cada nivel, y se lanza con Espacio, `↑` o `W`.
  - El ángulo de salida de la nave depende del punto de impacto (hasta 60° respecto a la vertical).
  - Velocidad del núcleo `min(640, 340 + 25 × (nivel − 1))` px/s.
  - Racha: bloques destruidos sin que ningún núcleo toque la nave. Multiplicador `min(5, 1 + floor((racha − 1) / 4))`.
  - Puntos: normal 10, duro 30 (al romperlo), ambos × multiplicador. Módulo atrapado 50. Bonus de muro 1.000 × nivel.
  - Módulos: un 12 % de los bloques destruidos suelta uno (como mucho 2 cayendo a la vez): AMPLIAR (nave de 144 px durante 10 s), FRENO (núcleos al 70 % durante 8 s) y MULTI (hasta 3 núcleos).
  - 3 vidas, máximo 5, con vida extra cada 20.000 puntos. Se pierde una vida cuando caen todos los núcleos.
  - Estado `dead` de 1 s ("¡NÚCLEO PERDIDO!") y estado `clear` de 1,5 s ("¡MURO PULVERIZADO!") entre niveles.
  - Niveles infinitos: el nivel `n` usa el patrón `(n − 1) mod 6`. Desde el nivel 7, los bloques normales de las filas 0, 3 y 6 pasan a duros.
  - Partículas propias al romper un bloque.
  - HUD dibujado en el canvas: PUNTOS, RACHA, NIVEL con el nombre del patrón, MÓDULOS activos con su tiempo y VIDAS (corazones).
  - Estado inicial `ready`: "BLOQUE BUSTER", "PULSA ESPACIO PARA EMPEZAR" y la línea de controles, sobre el patrón EMBUDO atenuado.
  - GAME OVER dentro del canvas. Espacio reinicia a `playing`.
  - Pausa en el motor: `P` y `Escape`, `pause()`/`resume()` y `visibilitychange`.
  - Paleta neón del vault. Todo el arte se dibuja por código.
  - `onChange(snapshot)` solo cuando cambia el snapshot.
  - `destroy()` cancela el rAF y retira todos los listeners.
- Componente cliente `games/bloque-buster/canvas.tsx` con `pause`/`resume`/`reset` por `ref`.
- Entrada `bloque-buster` en `GAME_REGISTRY` (`games/registry.ts`). `GamePlayer` no cambia:
  - El HUD de la plataforma muestra el snapshot (vidas con corazones).
  - PAUSA/REANUDAR, FIN y GUARDAR PUNTUACIÓN en `public.scores` con `game_id = "bloque-buster"`.
  - JUGAR DE NUEVO llama a `reset()`.

**Fuera de alcance (para specs futuras):**

- Portar `references/started-games/04-arkanoid/` (código, `levels.js`, spritesheet o sonidos), o copiar sus assets a `public/`.
- Rediseñar la portada `cover-bricks` o cambiar los textos, `best` y `plays` de la ficha.
- Borrar o separar las puntuaciones de `bloque-buster` guardadas con la partida simulada.
- Control con ratón (la referencia lo tenía) y selector de nivel en la pausa.
- Módulos negativos (nave corta, núcleo rápido), disparo desde la nave, núcleo pegajoso, enemigos y jefes.
- Final del juego (estado `won`), editor de niveles y patrones aleatorios.
- Sonido y música.
- Mostrar la racha o los módulos en el HUD de la plataforma (solo se ven en el canvas).
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
// lib/games.ts — SIN CAMBIOS. La ficha ya existe en 1.ª posición y se reutiliza tal cual.
// CoverClass tampoco cambia: "cover-bricks" ya está en la unión.
{
  id: "bloque-buster",
  title: "BLOQUE BUSTER",
  short: "Rebota la pelota y destruye muros de neón.",
  long: "Pilota una nave-paleta y rebota un núcleo de plasma para pulverizar muros de bloques cromáticos. Cada nivel reorganiza la grilla en patrones imposibles. ¿Hasta dónde llegará tu racha?",
  cat: "ARCADE",
  cover: "cover-bricks",
  color: "cyan",
  best: 28450,
  plays: "12.4K",
}
```

```sql
-- SIN MIGRACIÓN. Estado actual de scores_game_id_check
-- (supabase/migrations/20261122045422_scores_game_vibora.sql), que ya admite 'bloque-buster':
alter table public.scores add constraint scores_game_id_check check (game_id in (
  'bloque-buster', 'caida', 'serpentina', 'gloton', 'invasores',
  'rocas', 'ranaria', 'duelo-pixel', 'asteroides', 'apila', 'vibora'
));
```

```ts
// games/registry.ts — nueva entrada
import { BloqueBusterCanvas } from "./bloque-buster/canvas";

"bloque-buster": {
  Canvas: BloqueBusterCanvas,
  initialSnapshot: { status: "ready", paused: false, score: 0, lives: 3, level: 1 },
},
```

```ts
// games/bloque-buster/levels.ts — datos puros, sin imports
// Leyenda: "." vacío, "c" cian, "m" magenta, "y" amarillo, "g" verde,
// "D" duro (2 golpes), "X" blindado (indestructible). 9 filas × 12 columnas.
export type Pattern = { name: string; rows: string[] };

export const PATTERNS: Pattern[] = [
  {
    name: "EMBUDO",
    rows: [
      "cc........cc",
      "mccc....cccm",
      "ymmcc..ccmmy",
      "gyymmccmmyyg",
      ".ggyymmyygg.",
      "...ggyygg...",
      ".....gg.....",
      "............",
      "............",
    ],
  }, // 52 bloques
  {
    name: "DIANA",
    rows: [
      "cccccccccccc",
      "c..........c",
      "c.mmmmmmmm.c",
      "c.m......m.c",
      "c.m.yDDy.m.c",
      "c.m......m.c",
      "c.mmmmmmmm.c",
      "c..........c",
      "ccccc..ccccc",
    ],
  }, // 62 bloques (2 duros)
  {
    name: "CORAZÓN",
    rows: [
      "............",
      "..mmm..mmm..",
      ".mmmmmmmmmm.",
      ".myymmmmmmm.",
      ".mmmmmmmmmm.",
      "..mmmmmmmm..",
      "...mmmmmm...",
      "....mmmm....",
      "XX...mm...XX",
    ],
  }, // 56 bloques + 4 blindados
  {
    name: "RAYO",
    rows: [
      "cccc..yyyyy.",
      "cccc.yyyyy..",
      "....yyyyy...",
      "...yyyyyDDy.",
      "......yyyy..",
      ".....yyyy...",
      "....yyy.....",
      "...yy.......",
      "..y.....gggg",
    ],
  }, // 49 bloques (2 duros)
  {
    name: "LA CÁMARA",
    rows: [
      "XXXXXXXXXXXX",
      "X.gggggggg.X",
      "X.gDDDDDDg.X",
      "X.gD.yy.Dg.X",
      "X.gD.yy.Dg.X",
      "X.gDDDDDDg.X",
      "X.gggggggg.X",
      "X..........X",
      "XXXX....XXXX",
    ],
  }, // 44 bloques (16 duros) + 34 blindados
  {
    name: "ESPIRAL",
    rows: [
      "cccccccccccc",
      "...........c",
      ".mmmmmmmmm.c",
      ".m.......m.c",
      ".m.yyyyy.m.c",
      ".m.y.DD..m.c",
      ".m.yyyyyyy.c",
      ".m.........c",
      ".ggggggggggc",
    ],
  }, // 62 bloques (2 duros)
];
```

```ts
// games/bloque-buster/engine.ts — sin "use client", sin imports de React
export type BloqueBusterStatus =
  "ready" | "playing" | "dead" | "clear" | "gameover";

export type BloqueBusterSnapshot = {
  status: BloqueBusterStatus;
  paused: boolean;
  score: number;
  lives: number; // 3 al empezar, máximo 5; 0 en gameover
  level: number; // nivel actual, 1 en adelante, sin tope
};

export type BloqueBusterEngine = {
  pause(): void; // solo tiene efecto en playing
  resume(): void;
  reset(): void; // vuelve a ready: patrón EMBUDO, score 0, nivel 1, 3 vidas, racha 0
  destroy(): void; // cancela el rAF y retira los listeners de window/document
};

export function createBloqueBusterEngine(
  canvas: HTMLCanvasElement,
  onChange: (snapshot: BloqueBusterSnapshot) => void,
): BloqueBusterEngine;

// Tipos internos:
type BrickKind = "normal" | "hard" | "armored";
type BrickColor =
  "cyan" | "magenta" | "yellow" | "green" | "silver" | "armored";
type Brick = {
  col: number;
  row: number;
  x: number;
  y: number;
  kind: BrickKind;
  color: BrickColor;
  hp: number;
  alive: boolean;
};
type Ball = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  trail: { x: number; y: number }[];
};
type ModuleKind = "wide" | "slow" | "multi"; // AMPLIAR, FRENO, MULTI
type FallingModule = { kind: ModuleKind; x: number; y: number }; // x, y = esquina superior izquierda
type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
};

// Estado interno en el closure:
// bricks: Brick[], balls: Ball[], docked: boolean, paddleX: number (borde izquierdo), paddleW: number,
// modules: FallingModule[], wideTimer: number, slowTimer: number, particles: Particle[],
// held: { left: boolean; right: boolean }, score, lives, level, racha, nextLifeAt,
// stateTimer (para dead y clear), lastTime, status, paused, rafId.
```

```ts
// games/bloque-buster/canvas.tsx — "use client"
export type BloqueBusterHandle = Pick<
  BloqueBusterEngine,
  "pause" | "resume" | "reset"
>;
export function BloqueBusterCanvas(props: {
  ref?: React.Ref<BloqueBusterHandle>;
  onChange: (snapshot: BloqueBusterSnapshot) => void;
}): React.JSX.Element;
```

Convenciones:

- **Lienzo.** La lógica trabaja en 800×600 (4:3) y el canvas se escala por CSS dentro de `.crt-screen`:
  - Franja de HUD de 800×50 en `y = 0`, con línea separadora en `y = 50`.
  - Campo de juego entre `FIELD_LEFT = 16` y `FIELD_RIGHT = 784`, con techo en `FIELD_TOP = 58`. Paredes y techo se dibujan 2 px por fuera (`x = 14`, `x = 786`, `y = 56`). El borde inferior está abierto.
  - Rejilla de bloques de 720×198 con origen en (40, 100), centrada en el campo con 24 px de pasillo a cada lado.
- **Constantes** (nuevas, sin referencia):
  - Lienzo: `W = 800`, `H = 600`, `HUD_H = 50`, `FIELD_LEFT = 16`, `FIELD_RIGHT = 784`, `FIELD_TOP = 58`.
  - Bloques: `BRICK_COLS = 12`, `BRICK_ROWS = 9`, `BRICK_W = 60`, `BRICK_H = 22`, `BRICKS_X = 40`, `BRICKS_Y = 100`, `BRICK_INSET = 2` (solo al dibujar; la colisión usa la celda completa).
  - Nave: `PADDLE_W = 96`, `PADDLE_W_WIDE = 144`, `PADDLE_H = 14`, `PADDLE_Y = 556` (borde superior), `PADDLE_SPEED = 560` px/s, `MAX_BOUNCE_ANGLE = 60°`.
  - Núcleo: `BALL_R = 7`, `BALL_BASE_SPEED = 340`, `BALL_SPEED_STEP = 25`, `BALL_MAX_SPEED = 640` (px/s), `LAUNCH_ANGLE = 15°`, `MAX_BALLS = 3`, `TRAIL_LENGTH = 4`.
  - Módulos: `MODULE_CHANCE = 0.12`, `MAX_FALLING_MODULES = 2`, `MODULE_W = 36`, `MODULE_H = 14`, `MODULE_FALL_SPEED = 160` px/s, `MODULE_POINTS = 50`, `WIDE_TIME = 10000` ms, `SLOW_TIME = 8000` ms, `SLOW_FACTOR = 0.7`, `MULTI_SPREAD = 25°`.
  - Puntos: `POINTS_NORMAL = 10`, `POINTS_HARD = 30`, `RACHA_STEP = 4`, `RACHA_MAX_MULT = 5`, `CLEAR_BONUS = 1000` (× nivel), `EXTRA_LIFE_EVERY = 20000`.
  - Vidas y estados: `START_LIVES = 3`, `MAX_LIVES = 5`, `DEAD_DELAY = 1000` ms, `CLEAR_DELAY = 1500` ms.
  - Partículas: `PARTICLES_PER_BRICK = 8`, `PARTICLE_LIFE = 400` ms, velocidad aleatoria de 60 a 180 px/s en dirección aleatoria, `PARTICLE_SIZE = 4`, `MAX_PARTICLES = 200`.
  - `MAX_DT = 50` ms.
- **Carga de nivel.** `loadLevel(n)`:
  - Usa `PATTERNS[(n − 1) % 6]`. Cada carácter distinto de `.` crea un `Brick` en `x = BRICKS_X + col × BRICK_W`, `y = BRICKS_Y + row × BRICK_H`.
  - `c`/`m`/`y`/`g` son normales (`hp = 1`) del color correspondiente. `D` es duro (`hp = 2`, `silver`). `X` es blindado (`hp = Infinity`, `armored`).
  - Si `n ≥ 7`, los normales con `row % 3 === 0` pasan a duros (`hp = 2`, `silver`).
  - Vacía `modules` y `particles`, anula `wideTimer` y `slowTimer` (nave a `PADDLE_W`, conservando su centro), pone `racha = 0`, deja un solo núcleo `docked` sobre la nave y calcula la velocidad del nivel.
- **Velocidad.** `levelSpeed = min(BALL_MAX_SPEED, BALL_BASE_SPEED + BALL_SPEED_STEP × (nivel − 1))`. `targetSpeed = levelSpeed × (slowTimer > 0 ? SLOW_FACTOR : 1)`. Al empezar o terminar FRENO, todos los núcleos se reescalan a `targetSpeed` sin cambiar su dirección.
- **Nave.** Mientras `held.left` o `held.right` (y no ambos), `paddleX` avanza `±PADDLE_SPEED × dt`, limitado a `[FIELD_LEFT, FIELD_RIGHT − paddleW]`. Con el núcleo `docked`, este sigue el centro de la nave en `y = PADDLE_Y − BALL_R`.
- **Lanzamiento.** Con `docked` en `playing`, Espacio, `↑` o `W` lanzan el núcleo a `targetSpeed` con `LAUNCH_ANGLE` respecto a la vertical: hacia la izquierda si `held.left`, si no hacia la derecha.
- **Movimiento del núcleo.** En cada `update`, cada núcleo se mueve en `steps = max(1, ceil(targetSpeed × dt / BALL_R))` subpasos, para no atravesar bloques de 22 px. En cada subpaso:
  - Paredes: si `x − r < FIELD_LEFT`, `x = FIELD_LEFT + r` y `vx = |vx|`. Simétrico en `FIELD_RIGHT`. Si `y − r < FIELD_TOP`, `y = FIELD_TOP + r` y `vy = |vy|`.
  - Nave: si `vy > 0`, el círculo solapa el rectángulo de la nave y `y < PADDLE_Y + PADDLE_H`: `offset = clamp((x − centroNave) / (paddleW / 2), −1, 1)`, `ángulo = offset × MAX_BOUNCE_ANGLE`, `vx = targetSpeed × sin(ángulo)`, `vy = −targetSpeed × cos(ángulo)`, `y = PADDLE_Y − r`, y `racha = 0`.
  - Bloques: se busca el primer bloque vivo que solapa el círculo (punto más cercano del rectángulo a menos de `r`). Si `|dx| > |dy|` (distancia del centro al punto más cercano) se invierte `vx` y se saca el núcleo en horizontal; si no, se invierte `vy` y se saca en vertical. Si el centro está dentro del rectángulo, se invierte `vy`. Un bloque por subpaso y núcleo.
  - Fondo: si `y − r > H`, el núcleo se elimina.
  - La estela guarda las últimas `TRAIL_LENGTH` posiciones al final de cada `update`, no de cada subpaso.
- **Impacto en bloque.**
  - Blindado: solo rebota. No suma ni cuenta para la racha.
  - Duro con `hp = 2`: pasa a `hp = 1` y se dibuja agrietado. No suma.
  - Destrucción (normal, o duro con `hp = 1`): `alive = false`, `racha += 1`, `mult = min(RACHA_MAX_MULT, 1 + floor((racha − 1) / RACHA_STEP))`, `score += (normal ? POINTS_NORMAL : POINTS_HARD) × mult`, emite `PARTICLES_PER_BRICK` partículas y, si `Math.random() < MODULE_CHANCE` y hay menos de `MAX_FALLING_MODULES` cayendo, suelta un módulo de tipo uniforme entre los 3, centrado en el bloque.
  - Si no queda ningún bloque destructible vivo: `score += CLEAR_BONUS × nivel`, el estado pasa a `clear` durante `CLEAR_DELAY` y se eliminan núcleos y módulos. Después, `nivel += 1`, `loadLevel(nivel)` y vuelta a `playing`.
- **Módulos.** Caen a `MODULE_FALL_SPEED`. Se eliminan al pasar `y > H`. Si su rectángulo solapa el de la nave, se atrapan: `score += MODULE_POINTS` y:
  - AMPLIAR (`wide`): `paddleW = PADDLE_W_WIDE` conservando el centro (y limitando a las paredes), `wideTimer = WIDE_TIME`. Volver a atraparlo reinicia el tiempo. Al expirar, vuelve a `PADDLE_W` conservando el centro.
  - FRENO (`slow`): `slowTimer = SLOW_TIME` y se reescalan los núcleos. Volver a atraparlo reinicia el tiempo.
  - MULTI (`multi`): si hay menos de `MAX_BALLS` núcleos en vuelo, se clona el primero rotando su velocidad `+MULTI_SPREAD` y, si aún cabe, `−MULTI_SPREAD`, hasta un máximo de 3. Si ya hay 3, solo suma los puntos.
  - Los temporizadores solo bajan en `update`, así que la pausa los congela.
- **Vida perdida.** Cuando no queda ningún núcleo y no estaba `docked`:
  - `lives − 1`, `racha = 0`, se vacían `modules`, se anulan AMPLIAR y FRENO.
  - Si quedan vidas, el estado pasa a `dead` durante `DEAD_DELAY`. En el canvas se ve "¡NÚCLEO PERDIDO!" y "VIDAS: N". Después, núcleo `docked` y vuelta a `playing`. Los bloques se conservan.
  - Si `lives` llega a 0, el estado pasa directamente a `gameover`.
- **Vida extra.** Tras cualquier suma de puntos, mientras `score ≥ nextLifeAt`: si `lives < MAX_LIVES`, `lives += 1`; en ambos casos `nextLifeAt += EXTRA_LIFE_EVERY`. `nextLifeAt` empieza en 20.000.
- **Partículas.** Se mueven en línea recta, `life` baja con `dt` y se dibujan con `globalAlpha = life / PARTICLE_LIFE`. Si se supera `MAX_PARTICLES`, se descartan las más antiguas. Siguen animándose en `dead` y `clear`.
- **Paleta.** Constantes en `engine.ts` con los valores de los tokens de `app/globals.css` (`--bg #0a0a0f`, `--ink #e6e9ff`, `--ink-dim #8a8fb5`, `--ink-faint #4a4f70`, `--cyan #00f5ff`, `--magenta #ff006e`, `--yellow #f5ff00`, `--green #00ff88`, `--gold #ffcf3a`, `--silver #c7d0e0`, `--line rgba(0, 245, 255, 0.18)`):
  - Nave-paleta: trapecio `--magenta` con `shadowBlur = 14`, propulsores de 10 px en `--cyan` en cada extremo y una luz central de 8×4 en `--yellow`. Con AMPLIAR activo, borde de 2 px en `--green`.
  - Núcleo: círculo `--ink` con glow `--cyan` (`shadowBlur = 18`). Estela de 4 círculos `--cyan` sin glow, con alpha de 0,25 a 0,05 y radio decreciente.
  - Bloques normales `--cyan`, `--magenta`, `--yellow` y `--green`. Duros `--silver`; agrietados con alpha 0,6 y una grieta diagonal de 2 px en `--bg`. Blindados en `--ink-faint` con rayado diagonal en `--line`.
  - Los bloques se dibujan **sin** `shadowBlur`: rectángulo con esquinas de 3 px, franja de brillo superior de 3 px en `rgba(255, 255, 255, 0.18)` y un halo de 1 px en su color al 35 % de alpha.
  - Módulos: cápsula `roundRect` de 36×14 con `shadowBlur = 10`. AMPLIAR "A" en `--green`, FRENO "F" en `--cyan`, MULTI "M" en `--gold`. Letra en `--bg`, `bold 11px monospace`.
  - Partículas en el color del bloque, sin glow.
  - Paredes y techo: líneas de 2 px en `--cyan` con `globalAlpha = 0.5`. Separador del HUD en `--line`. Fondo `--bg`.
  - HUD: etiquetas en `--ink-dim` (`13px monospace`), valores en `--yellow` (`bold 22px monospace`), racha con multiplicador ≥ ×2 en `--magenta`, corazones en `--magenta`. Píldoras de módulos activos en su color con los segundos restantes (`ceil(timer / 1000)`).
  - Overlays sobre `rgba(10, 10, 15, 0.7)`. "BLOQUE BUSTER" en `--cyan` con glow, "GAME OVER" y "¡NÚCLEO PERDIDO!" en `--magenta`, "¡MURO PULVERIZADO!" en `--gold`, resto en `--ink`.
- **HUD del canvas.** Columnas en la franja de 50 px: PUNTOS en `x = 24`, RACHA (`×N`) en `x = 220`, NIVEL (`03 · CORAZÓN`) en `x = 360`, MÓDULOS en `x = 560` (píldoras de 40×18, vacío si no hay ninguno) y VIDAS alineadas a la derecha en `x = 776`.
- **Textos de los overlays.**
  - `ready`: "BLOQUE BUSTER" (`bold 44px`), "PULSA ESPACIO PARA EMPEZAR" (`15px`) y "← → / A D MOVER · ESPACIO LANZAR · P PAUSA" (`13px`, `--ink-dim`).
  - `playing` con el núcleo `docked`: "ESPACIO PARA LANZAR" en `y = 520`, `--ink-dim`, parpadeando cada 500 ms.
  - `dead`: "¡NÚCLEO PERDIDO!" y "VIDAS: N".
  - `clear`: "¡MURO PULVERIZADO!", "BONUS +N" y "SIGUIENTE: " seguido del nombre del patrón del nivel siguiente (p. ej. "SIGUIENTE: DIANA").
  - `gameover`: "GAME OVER" y "PUNTAJE: N — ESPACIO PARA REINICIAR".
- **Input.**
  - `keydown` y `keyup` en `window`. Se ignoran eventos cuyo `target` sea `input`, `textarea` o `contentEditable`.
  - `preventDefault()` en `ArrowLeft`, `ArrowRight`, `ArrowUp`, `KeyA`, `KeyD`, `KeyW`, `Space`, `KeyP` y `Escape`.
  - `ArrowLeft`/`KeyA` y `ArrowRight`/`KeyD` actualizan `held` en `keydown` y `keyup`.
  - Se ignora `e.repeat` en `Space`, `ArrowUp`, `KeyW`, `KeyP` y `Escape`, para que mantener la tecla no alterne la pausa ni relance.
  - En `ready` y `gameover`, Espacio arranca o reinicia la partida a `playing` con el núcleo `docked`, **sin lanzarlo**. Las demás teclas no arrancan.
  - En `playing`, Espacio, `↑` y `W` lanzan solo si el núcleo está `docked`. En `dead` y `clear` se ignoran lanzamiento y pausa; la nave no se mueve.
- **Pausa.** `P` y `Escape` alternan la pausa solo en `playing`. Con `paused: true` el loop dibuja el último frame sin `update` y las teclas de juego no actúan. Al pausar (por tecla, `pause()` o `visibilitychange`) se ponen `held.left` y `held.right` a `false`, para que la nave no siga moviéndose si se suelta la tecla durante la pausa. Al reanudar se reinicia `lastTime`, así que `dt` no acumula.
- **Snapshot.**
  - `lives` es el número de vidas (0 en `gameover`), y el HUD de la plataforma las muestra como corazones.
  - `level` es el nivel del juego.
  - `onChange` se llama al crear con (`ready`, 0, 3, 1, `paused: false`).
- **Otros.**
  - El motor no carga imágenes ni sonidos y no lee `localStorage`.
  - Números en el canvas con `toLocaleString("es-ES")`, igual que el HUD de la plataforma.

## Plan de implementación

Cada paso deja el sistema funcionando y termina con su **Prueba manual**.

1. **Ficha, portada y Home (verificación, sin cambios).**
   - Confirmar que `bloque-buster` sigue en `GAMES` con `cover-bricks` y que `HOME_STATS` dice "11". No se edita `lib/games.ts`, `app/globals.css` ni `lib/home.ts`.
   - No se diseña portada nueva con `/frontend-design`: se mantiene `cover-bricks` (ficha sustituida).
   - Prueba manual: `/biblioteca` muestra 11 tarjetas con BLOQUE BUSTER la primera, y `/juegos/bloque-buster/jugar` abre todavía la partida simulada.
2. **CHECK de `scores` (verificación, sin migración).**
   - No se ejecuta `npx supabase migration new`, ni `npm run db:push`, ni `npm run db:types`.
   - Prueba manual: `grep -l "'bloque-buster'" supabase/migrations/*.sql` lista la última migración (`20261122045422_scores_game_vibora.sql`), y `npx supabase migration list --remote` no muestra migraciones pendientes.
3. **Patrones y motor (jugabilidad).**
   - Crear `games/bloque-buster/levels.ts` con `PATTERNS` tal cual el modelo de datos.
   - Crear `games/bloque-buster/engine.ts` con las constantes, los tipos, `loadLevel`, `levelSpeed`, `launch`, `movePaddle`, `stepBall` (paredes, nave, bloques), `hitBrick`, `spawnModule`, `catchModule`, `applyModule`, `loseLife`, `checkClear` y `checkExtraLife`.
   - Dibujar campo, paredes, bloques, nave, núcleos con estela, módulos, partículas y el HUD superior en el canvas de 800×600.
   - El estado vive en el closure de `createBloqueBusterEngine`. No se accede a `window` ni a `document` al importar.
   - Prueba manual: `npx tsc --noEmit` y `npm run lint` pasan.
4. **Ciclo de vida, estados e input.**
   - Añadir el estado `ready` con su overlay y el patrón EMBUDO atenuado detrás.
   - Añadir `dead` (1 s), `clear` (1,5 s), el GAME OVER en canvas y el reinicio con Espacio sin lanzar.
   - Añadir la pausa (`P`, `Escape`, `visibilitychange`, `pause()`/`resume()`) con el vaciado de `held`, y `reset()`.
   - Añadir `destroy()`, el limitador de `dt` a 50 ms y el input con `preventDefault` que ignora campos de texto y `e.repeat`.
   - Emitir `onChange` solo cuando cambia algún campo del snapshot.
   - Prueba manual: `npx tsc --noEmit` pasa.
5. **Componente canvas.**
   - Crear `games/bloque-buster/canvas.tsx` copiando el patrón de `games/vibora/canvas.tsx`, con `<canvas width={800} height={600}>`.
   - Prueba manual: `npx tsc --noEmit` y `npm run lint` pasan.
6. **Integración en el reproductor.**
   - Añadir la entrada `"bloque-buster"` a `GAME_REGISTRY`. `components/game-player.tsx` no se toca.
   - Prueba manual:
     - En `/juegos/bloque-buster/jugar` se ve "PULSA ESPACIO PARA EMPEZAR" y el HUD muestra ♥ ♥ ♥.
     - Espacio arranca con el núcleo sobre la nave, y un segundo Espacio lo lanza.
     - Romper el primer bloque suma 10 en el canvas y en el HUD.
     - FIN abre el modal con esa puntuación, y GUARDAR crea una fila en `public.scores` con `game_id = 'bloque-buster'`.
7. **Paleta neón.**
   - Aplicar los colores por rol de las convenciones, con glow en la nave, el núcleo y los módulos, la estela y el parpadeo de "ESPACIO PARA LANZAR".
   - Prueba manual: los 4 colores de bloque, los duros plateados (y agrietados tras el primer golpe), los blindados apagados y cada módulo con su color y letra.

## Criterios de aceptación

- [ ] `npm run build`, `npm run lint` y `npx tsc --noEmit` terminan sin errores.
- [ ] `/juegos/bloque-buster` y `/juegos/bloque-buster/jugar` se prerenderizan como las demás rutas de `/juegos/[id]`, y `/salon` sigue siendo estática.
- [ ] `/biblioteca` sigue mostrando 11 tarjetas. BLOQUE BUSTER es la primera y aparece con el filtro ARCADE junto a SERPENTINA, GLOTÓN, RANARIA y VÍBORA.
- [ ] La portada `cover-bricks` se ve igual que antes en la tarjeta, en el Detalle y en el rail de la Home, y sigue siendo distinta de las demás.
- [ ] El primer stat de la Home sigue diciendo "11" / "JUEGOS" / "Y CONTANDO", y el rail sigue mostrando los mismos 6 juegos.
- [ ] El Salón de la Fama sigue mostrando la pestaña BLOQUE BUSTER, y "TODOS LOS JUEGOS" sigue teniendo 11 filas.
- [ ] `git diff` no muestra archivos nuevos en `supabase/migrations/` ni cambios en `lib/games.ts`, `lib/home.ts`, `app/globals.css`, `lib/database.types.ts` ni `components/game-player.tsx`.
- [ ] Un insert en `public.scores` con `game_id = 'bloque-buster'` funciona sin migración nueva, y uno con `'pong'` sigue fallando.
- [ ] Al abrir `/juegos/bloque-buster/jugar`, el canvas muestra "BLOQUE BUSTER", "PULSA ESPACIO PARA EMPEZAR" y la línea de controles sobre el patrón EMBUDO. Nada se mueve, la puntuación del HUD es 0, Vidas muestra ♥ ♥ ♥ y Nivel muestra 01.
- [ ] El canvas muestra la franja de HUD (PUNTOS, RACHA, NIVEL con el nombre del patrón, MÓDULOS y VIDAS) encima del campo con paredes y techo.
- [ ] Pulsar Espacio para empezar deja el núcleo sobre la nave sin lanzarlo, con "ESPACIO PARA LANZAR" parpadeando.
- [ ] Con el núcleo sobre la nave, `←`/`→` y `A`/`D` la mueven y el núcleo la acompaña. Espacio, `↑` o `W` lo lanzan hacia la derecha, o hacia la izquierda si se mantiene `←`/`A`.
- [ ] La nave no sale del campo por ninguno de los dos lados.
- [ ] Pulsar flechas, `A`, `D`, `W`, Espacio, `P` o `Escape` no hace scroll de la página.
- [ ] El núcleo rebota en las paredes laterales y en el techo. Al golpear el centro de la nave sale casi vertical y al golpear un extremo sale inclinado hacia ese lado.
- [ ] A velocidad máxima (nivel 13 o superior) el núcleo no atraviesa bloques ni sale por las paredes.
- [ ] Bloques:
  - Un bloque normal desaparece de un golpe y suelta partículas de su color.
  - Un bloque duro se agrieta con el primer golpe (sin sumar) y desaparece con el segundo.
  - Un bloque blindado nunca desaparece y el nivel termina aunque quede alguno.
- [ ] Puntuación:
  - El primer bloque normal roto tras un toque en la nave suma 10, y un duro suma 30.
  - El 5.º bloque roto sin que el núcleo toque la nave suma ×2 (20 si es normal), y la RACHA del canvas muestra ×2 en magenta.
  - Tocar la nave devuelve la racha a ×1.
  - Atrapar un módulo suma 50.
  - La puntuación del HUD de la plataforma coincide con la del canvas.
- [ ] Durante una partida aparecen módulos de los 3 tipos, nunca más de 2 cayendo a la vez, y desaparecen si caen sin atraparse:
  - AMPLIAR ensancha la nave a 144 px durante 10 s, con borde verde y su píldora "A" en el HUD.
  - FRENO ralentiza el núcleo durante 8 s, con su píldora "F".
  - MULTI deja 3 núcleos en juego. Perder 1 o 2 no quita vida; perder el último, sí.
- [ ] Al romper el último bloque destructible se ve "¡MURO PULVERIZADO!" con "BONUS +1.000" (en el nivel 1) y "SIGUIENTE: DIANA" durante 1,5 s, y después el nivel 2 empieza con el núcleo sobre la nave. Nivel muestra 02 en el canvas y en el HUD de la plataforma, y el núcleo es más rápido.
- [ ] Los niveles 1 a 6 muestran EMBUDO, DIANA, CORAZÓN, RAYO, LA CÁMARA y ESPIRAL. El nivel 7 vuelve a EMBUDO con las filas 0, 3 y 6 en bloques duros plateados.
- [ ] Perder el núcleo por abajo:
  - Quita una vida en el canvas y en el HUD.
  - Muestra "¡NÚCLEO PERDIDO!" durante 1 s.
  - Vuelve a dejar el núcleo sobre la nave, con los bloques restantes intactos, la racha a ×1 y sin módulos activos.
- [ ] Al llegar a 20.000 puntos se gana una vida (si había menos de 5), y nunca se muestran más de 5 corazones.
- [ ] Al perder la última vida, el canvas muestra "GAME OVER" con la puntuación, Vidas muestra "—" y el modal no se abre solo. Espacio inicia una partida nueva con 0 puntos, nivel 1, EMBUDO completo y 3 vidas, con el núcleo sobre la nave.
- [ ] `P`, `Escape` y el botón PAUSA pausan y muestran "EN PAUSA". El núcleo, los módulos y la nave se detienen, y los temporizadores de AMPLIAR y FRENO no avanzan. Repetirlos (o REANUDAR) reanuda sin saltos.
- [ ] Mantener `→` al pausar y soltarla durante la pausa no deja la nave moviéndose al reanudar.
- [ ] Mantener pulsada `P` no hace parpadear la pausa.
- [ ] Cambiar de pestaña durante la partida la deja en pausa al volver.
- [ ] FIN pausa el motor y abre "FIN DEL JUEGO" con la puntuación actual, o con la final si ya hubo GAME OVER.
- [ ] En el modal se pueden escribir iniciales con espacios y letras W/A/D sin que la nave se mueva, el núcleo se lance ni la página haga scroll.
- [ ] GUARDAR PUNTUACIÓN crea exactamente una fila en `public.scores` con `game_id = 'bloque-buster'`, el nombre del input y la puntuación mostrada.
- [ ] Tras guardar, `/salon` muestra la puntuación en la pestaña BLOQUE BUSTER y en la fila BLOQUE BUSTER de "TODOS LOS JUEGOS".
- [ ] JUGAR DE NUEVO cierra el modal y deja el canvas en "PULSA ESPACIO PARA EMPEZAR" con 0 puntos, nivel 1 y 3 vidas.
- [ ] Al salir con SALIR y volver a entrar solo hay un loop activo: el núcleo va a la velocidad normal y la consola no muestra errores.
- [ ] Colores: nave magenta con propulsores cian, núcleo blanco con glow cian y estela, bloques cian/magenta/amarillo/verde, duros plateados, blindados apagados, módulos A verde, F cian y M dorado.
- [ ] La pestaña Network no muestra peticiones de imágenes ni sonidos del juego (todo dibujado por código).
- [ ] ASTEROIDES, APILA, VÍBORA y los juegos simulados (CAÍDA, SERPENTINA, GLOTÓN, INVASORES, ROCAS, RANARIA, DUELO PIXEL) se comportan exactamente igual que antes.

## Decisiones

- **Sí:** juego original de game jam con el tema "BLOQUE BUSTER". Del género solo se toma la mecánica de paleta, rebote y bloques. **No:** copiar el nombre, los niveles, el arte ni el aspecto de ningún juego comercial.
- **Sí:** reutilizar la ficha existente `bloque-buster` (1.ª posición, ARCADE, `cyan`, `cover-bricks`) y sus textos. Es el tema de la jam, mantiene rutas, pestaña del Salón y CHECK sin migración, y el `long` ya describe el juego (nave-paleta, núcleo de plasma, patrones, racha).
- **No:** ficha nueva al final de `GAMES`. Duplicaría BLOQUE BUSTER en la Biblioteca.
- **Sí:** sin migración. `'bloque-buster'` está en `scores_game_id_check` desde `20261121193937_scores.sql`. **No:** quitar el CHECK (SPEC 05 lo decidió para bloquear ids inexistentes).
- **Sí:** stat de la Home sin cambios ("11"): el número de juegos no varía.
- **Sí:** mantener la portada `cover-bricks` (ficha sustituida, como indica el checklist). **No:** `cover-bloque-buster` nueva en esta spec. (decisión del agente, a confirmar)
- **No:** portar `references/started-games/04-arkanoid/`. Recrea un juego comercial concreto, sus niveles son los genéricos de ese juego y su spritesheet y sonidos no tienen licencia documentada. Además usa globales, `document` al importar y listeners sin retirar.
- **Sí:** 6 patrones propios (EMBUDO, DIANA, CORAZÓN, RAYO, LA CÁMARA y ESPIRAL) en `levels.ts`, con nombres del universo del vault ("LA CÁMARA" es la bóveda acorazada). Dan sentido a "cada nivel reorganiza la grilla en patrones imposibles". (decisión del agente, a confirmar)
- **Sí:** niveles infinitos que repiten los 6 patrones, con bloques duros en las filas 0, 3 y 6 desde el nivel 7. **No:** estado `won`. Un juego de leaderboard premia aguantar, y repetir endurecido evita diseñar 12 patrones. (decisión del agente, a confirmar)
- **Sí:** tres tipos de bloque (normal, duro, blindado). Dan variedad a los patrones sin nuevas mecánicas de física.
- **Sí:** racha que multiplica los puntos hasta ×5 cada 4 bloques y se reinicia al tocar la nave. Premia los rebotes largos dentro del muro y es la "racha" del texto de la ficha. (decisión del agente, a confirmar)
- **Sí:** 3 módulos positivos (AMPLIAR, FRENO, MULTI) con un 12 % de probabilidad y como mucho 2 cayendo. **No:** módulos negativos, disparo ni núcleo pegajoso: alargan la spec más allá de M. (decisión del agente, a confirmar)
- **Sí:** multibola de hasta 3 núcleos. Solo se pierde vida cuando caen todos.
- **Sí:** 3 vidas, máximo 5, con vida extra cada 20.000 puntos. Usa el HUD de vidas de la plataforma y da un objetivo a medio plazo. **No:** una sola vida con "—". (decisión del agente, a confirmar)
- **Sí:** velocidad del núcleo de 340 a 640 px/s (+25 por nivel), con tope en el nivel 13. (decisión del agente, a confirmar)
- **Sí:** ángulo de salida de la nave según el punto de impacto, hasta 60°. Es la única forma de apuntar, y como paredes y bloques solo invierten un componente, la velocidad vertical nunca baja del 50 %: no hay bucles horizontales infinitos.
- **Sí:** el núcleo espera sobre la nave al empezar cada vida y cada nivel, y se lanza con Espacio, `↑` o `W`. **No:** lanzamiento automático por tiempo.
- **Sí:** Espacio en `ready`/`gameover` solo arranca, sin lanzar, igual que en APILA (Espacio no hace hard drop al empezar).
- **Sí:** solo teclado (`←`/`→` y `A`/`D` mantenidas, con `keyup`), como el resto de motores. **No:** ratón, aunque la referencia lo tuviera. (decisión del agente, a confirmar)
- **Sí:** subpasos de movimiento de como mucho `BALL_R` px para que el núcleo no atraviese bloques de 22 px a 640 px/s con `dt` de 50 ms.
- **Sí:** estados `dead` (1 s) y `clear` (1,5 s), como `dead` en ASTEROIDES y VÍBORA. Dejan ver el fallo y el bonus.
- **Sí:** bloques sin `shadowBlur`, con halo simulado. Glow solo en nave, núcleo y módulos.
- **Sí:** todo el arte dibujado por código con los tokens del vault. **No:** el spritesheet ni los `.mp3` de la referencia.
- **Sí:** la racha y los módulos solo se ven en el canvas. El snapshot se queda con los campos del contrato.
- **Sí:** se mantienen todos los defaults de SPEC 04: estado `ready`, GAME OVER en el canvas con Espacio, pausa en el motor con `P`/`Escape`, HUD doble y modal solo con FIN.
- **Sí:** FIN congela la puntuación y JUGAR DE NUEVO llama a `reset()`, igual que en SPEC 04, 06 y 07.
- **Sí:** movimiento continuo con `dt` dentro del rAF, limitado a 50 ms.
- **Sí:** motor `createBloqueBusterEngine(canvas, onChange)` en `games/bloque-buster/`, con el mismo patrón que ASTEROIDES, APILA y VÍBORA. Se registra en `GAME_REGISTRY` sin tocar `GamePlayer`.
- **Sí:** la puntuación se guarda en `public.scores` con el flujo de SPEC 05. El motor no conoce Supabase.
- **No:** borrar las puntuaciones de `bloque-buster` que se guardaron con la partida simulada. La tabla no admite `delete` por RLS y es una decisión del usuario. (decisión del agente, a confirmar)

## Riesgos

| Riesgo                                                                         | Mitigación                                                                                                                              |
| ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| El núcleo atraviesa bloques o paredes a alta velocidad                         | Subpasos de como mucho `BALL_R` px por núcleo y `dt` limitado a 50 ms. Hay un criterio a velocidad máxima.                              |
| El núcleo golpea dos bloques en la esquina y se mete dentro de la rejilla      | Un bloque por subpaso, con empuje fuera del bloque por el eje de menor penetración.                                                     |
| El núcleo queda en un bucle casi horizontal                                    | Solo la nave fija el ángulo (máximo 60°). Paredes y bloques solo invierten un componente.                                               |
| El núcleo queda atrapado entre blindados en LA CÁMARA                          | El patrón deja una entrada de 4 celdas (240 px) abajo y pasillos interiores. El bucle siempre acaba bajando por la componente vertical. |
| La nave sigue moviéndose tras soltar la tecla durante la pausa o el modal      | `held` se vacía al pausar y en `visibilitychange`. Hay un criterio.                                                                     |
| Espacio para empezar lanza el núcleo, o mantener `P` alterna la pausa en bucle | Espacio en `ready`/`gameover` solo cambia de estado, y se ignora `e.repeat`. Hay criterios para los dos.                                |
| Las puntuaciones simuladas antiguas dominan el Salón                           | Fuera de alcance. Queda como pregunta abierta en el concepto.                                                                           |
| Se edita la ficha o se crea una migración por inercia del patrón de SPEC 06/07 | Pasos 1 y 2 son solo de verificación, y hay un criterio con `git diff`.                                                                 |
| WASD mueve la nave al escribir iniciales en el modal                           | Se ignoran `input`/`textarea`/`contentEditable`, y el motor está pausado con el modal abierto.                                          |
| Strict Mode monta dos veces y deja dos loops                                   | El motor se crea en `useEffect` con `destroy()` en el cleanup. Hay un criterio de un solo loop.                                         |
| El motor toca `window` al importarse y rompe el prerender                      | Solo se accede dentro de `createBloqueBusterEngine`, que se llama en `useEffect`.                                                       |
| `onChange` en cada frame provoca 60 renders/s                                  | Se compara con el último snapshot emitido.                                                                                              |
| El glow (`shadowBlur`) en hasta 78 bloques y 200 partículas baja los FPS       | Bloques y partículas sin `shadowBlur`. Glow solo en la nave, hasta 3 núcleos y hasta 2 módulos.                                         |
| Canvas escalado borroso en pantallas grandes                                   | Aceptable por el estilo retro. `devicePixelRatio` irá en otra spec.                                                                     |

## Lo que **no** entra en esta spec

- El código, los niveles, el spritesheet y los sonidos de `references/started-games/04-arkanoid/`.
- Rediseño de `cover-bricks` y cambios en los textos, `best` y `plays` de la ficha.
- Limpieza de las puntuaciones simuladas de `bloque-buster`.
- Ratón, selector de nivel, módulos negativos, disparo, núcleo pegajoso, enemigos, jefes, final con `won` y editor de niveles.
- Sonido y música.
- Racha y módulos en el HUD de la plataforma.
- Datos reales en el Detalle, en la Home y en `best`/`plays`.
- Controles táctiles y gamepad virtual.
- Modal automático al GAME OVER.
- Etiquetas del Detalle por juego.
- Anti-trampas, tests automatizados y `devicePixelRatio`.

Cada uno de estos puntos, si llega, va en su propia spec.
