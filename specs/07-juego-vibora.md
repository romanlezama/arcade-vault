# SPEC 07 — Juego VÍBORA: serpiente original con frutas neón

> **Estado:** Implementado
> **Depende de:** SPEC 04, SPEC 05, SPEC 06
> **Fecha:** 2026-11-21
> **Objetivo:** Añadir la ficha VÍBORA y ejecutar en `/juegos/vibora/jugar` un juego de serpiente original, escrito en TypeScript dentro del CRT y registrado en `GAME_REGISTRY`, que notifica a React la puntuación, las vidas, el nivel y el estado, y guarda en el leaderboard real.

## Por qué existe esta spec

Es el primer juego real **sin código de referencia**: no hay carpeta en `references/started-games/`. Las mecánicas, la puntuación, los controles y las condiciones de fin salen de las respuestas del usuario y quedan fijadas aquí. Del género "serpiente" se toma solo la mecánica (moverse por una rejilla, comer, crecer, no chocar). No se copia el nombre, el arte ni el aspecto de ningún juego comercial.

El usuario aportó `references/source-assets/snake-assets/` (`fruits.png` de 3790×442 y `sprites.js` con un atlas). Esta spec **no los usa**, por dos motivos:

- `sprites.js` indica que el PNG sale del juego de serpiente de Google (spriters-resource). Es el arte de un juego concreto y no tenemos derechos de uso.
- Las coordenadas del atlas no cuadran con la imagen. Por ejemplo, el primer recorte de la fila central es una naranja, no `banana`.

En su lugar, las frutas se dibujan por código como sprites pixelados propios con la paleta neón del vault.

VÍBORA entra como **ficha nueva**, y SERPENTINA sigue como juego simulado, igual que ROCAS frente a ASTEROIDES y CAÍDA frente a APILA. El registro de motores ya existe (SPEC 06), así que solo se añade una entrada.

## Alcance

**Entra:**

- Nueva ficha en `GAMES` (`lib/games.ts`), en 11.ª posición: `id: "vibora"`, título "VÍBORA", categoría ARCADE, color `magenta`. Portada nueva `cover-vibora` en `app/globals.css`.
- Stat de la Home: "10" pasa a "11" (`HOME_STATS` en `lib/home.ts`).
- Migración `supabase/migrations/<timestamp>_scores_game_vibora.sql` que añade `'vibora'` a `scores_game_id_check`.
- Motor nuevo en `games/vibora/engine.ts`, sin React ni globales:
  - Tablero de 32×22 celdas de 25 px rodeado de muro. El HUD ocupa una franja superior de 50 px.
  - La serpiente empieza con 3 segmentos en el centro, mirando a la derecha.
  - Avanza una celda por tic. Se controla con flechas o WASD. No puede girar 180° y hay una cola de hasta 2 giros pendientes.
  - Siempre hay una fruta normal en el tablero, de uno de 4 tipos visuales: manzana, cereza, uva o limón. Comerla suma 10 × nivel y alarga la serpiente 1 segmento.
  - Fruta dorada: al comer una fruta normal hay un 15 % de probabilidad de que aparezca además una dorada, si no hay ya una. Dura 5 s de juego, vale 50 × nivel y también alarga 1 segmento.
  - Nivel `floor(frutas / 5) + 1`. Las frutas doradas también cuentan. Tic de `max(60, 150 − (nivel − 1) × 10)` ms.
  - 3 vidas. Chocar con el muro o con el propio cuerpo quita una vida. Tras 1 s de pausa (estado `dead`), la serpiente reaparece en el centro con 3 segmentos. Se conservan la puntuación, las frutas comidas y el nivel.
  - GAME OVER al perder la última vida.
  - Victoria (estado `won`) si la serpiente llena el tablero y no queda celda libre para la fruta.
  - HUD dibujado en el canvas: PUNTOS, FRUTAS, NIVEL y VIDAS (corazones).
  - Estado inicial `ready`: "VÍBORA" y "PULSA ESPACIO PARA EMPEZAR".
  - GAME OVER dentro del canvas. Espacio reinicia a `playing`.
  - Estado `won`: "¡TABLERO COMPLETO!" con la puntuación. Espacio reinicia.
  - Pausa en el motor: `P` y `Escape`, `pause()`/`resume()` y `visibilitychange`.
  - Paleta neón del vault. Las frutas son sprites pixelados propios definidos como matrices en el motor.
  - `onChange(snapshot)` solo cuando cambia el snapshot.
  - `destroy()` cancela el rAF y retira todos los listeners.
- Componente cliente `games/vibora/canvas.tsx` con `pause`/`resume`/`reset` por `ref`.
- Entrada `vibora` en `GAME_REGISTRY` (`games/registry.ts`). `GamePlayer` no cambia:
  - El HUD de la plataforma muestra el snapshot (vidas con corazones).
  - PAUSA/REANUDAR, FIN y GUARDAR PUNTUACIÓN en `public.scores` con `game_id = "vibora"`.
  - JUGAR DE NUEVO llama a `reset()`.

**Fuera de alcance (para specs futuras):**

- Usar `fruits.png` o `sprites.js` de `references/source-assets/snake-assets/`, o copiarlos a `public/`.
- Cambiar o retirar la ficha SERPENTINA, que sigue simulada.
- Bordes que se atraviesan (wrap), obstáculos internos, niveles con mapas distintos y modo a dos jugadores.
- Valor de puntos distinto por tipo de fruta (los 4 tipos solo cambian el aspecto).
- Sonido y música.
- Mostrar las frutas comidas en el HUD de la plataforma (solo se ven en el canvas).
- Datos reales en el aside "MEJORES PUNTUACIONES" del Detalle (sigue con `seededScores`, `app/juegos/[id]/page.tsx`).
- Datos reales en la Home y en `best`/`plays` de las fichas.
- Controles táctiles, swipe o gamepad virtual.
- Abrir el modal "FIN DEL JUEGO" automáticamente al GAME OVER.
- Etiquetas fijas del Detalle ("TECLADO / TÁCTIL", "RETRO 1985", dificultad).
- Anti-trampas y validación de la puntuación en servidor.
- Tests automatizados.
- Ajuste por `devicePixelRatio`.

## Modelo de datos

```ts
// lib/games.ts — se amplía la unión y se añade la ficha al final de GAMES
export type CoverClass = /* …las 10 actuales… */ | "cover-vibora";

{
  id: "vibora",
  title: "VÍBORA",
  short: "Devora frutas neón y caza la dorada antes de que se apague.",
  long: "Una víbora de luz recorre un tablero amurallado en busca de manzanas, cerezas, uvas y limones. Cada bocado la alarga, y cada cinco frutas acelera su paso. A veces brota una fruta dorada que vale cinco veces más, pero solo dura cinco segundos. Tienes tres vidas: chocar contra el muro o contra tu propia cola te cuesta una.",
  cat: "ARCADE",
  cover: "cover-vibora",
  color: "magenta",
  best: 4280,
  plays: "0.5K",
}
```

```sql
-- supabase/migrations/<timestamp>_scores_game_vibora.sql
-- SPEC 07 — VÍBORA: añade 'vibora' a los juegos admitidos en scores.
-- Debe ir a la par con GAMES (lib/games.ts).
alter table public.scores drop constraint scores_game_id_check;
alter table public.scores add constraint scores_game_id_check check (game_id in (
  'bloque-buster', 'caida', 'serpentina', 'gloton', 'invasores',
  'rocas', 'ranaria', 'duelo-pixel', 'asteroides', 'apila', 'vibora'
));
```

```ts
// games/registry.ts — nueva entrada
vibora: {
  Canvas: ViboraCanvas,
  initialSnapshot: { status: "ready", paused: false, score: 0, lives: 3, level: 1 },
},
```

```ts
// games/vibora/engine.ts — sin "use client", sin imports de React
export type ViboraStatus = "ready" | "playing" | "dead" | "gameover" | "won";

export type ViboraSnapshot = {
  status: ViboraStatus;
  paused: boolean;
  score: number;
  lives: number; // 3 al empezar; 0 en gameover
  level: number; // floor(fruitsEaten / 5) + 1
};

export type ViboraEngine = {
  pause(): void; // solo tiene efecto en playing
  resume(): void;
  reset(): void; // vuelve a ready: serpiente inicial, score 0, frutas 0, nivel 1, 3 vidas
  destroy(): void; // cancela el rAF y retira los listeners de window/document
};

export function createViboraEngine(
  canvas: HTMLCanvasElement,
  onChange: (snapshot: ViboraSnapshot) => void,
): ViboraEngine;

// Estado interno en el closure:
type Cell = { x: number; y: number }; // coordenadas de rejilla, origen arriba-izquierda
type Dir = "up" | "down" | "left" | "right";
type FruitKind = "manzana" | "cereza" | "uva" | "limon";
// snake: Cell[] (índice 0 = cabeza), dir: Dir, dirQueue: Dir[] (máx. 2),
// growPending: number, fruit: { cell: Cell; kind: FruitKind },
// golden: { cell: Cell; ttl: number } | null,
// score, fruitsEaten, level, lives, tickAccum, deadTimer, lastTime, status, paused.
```

```ts
// games/vibora/canvas.tsx — "use client"
export type ViboraHandle = Pick<ViboraEngine, "pause" | "resume" | "reset">;
export function ViboraCanvas(props: {
  ref?: React.Ref<ViboraHandle>;
  onChange: (snapshot: ViboraSnapshot) => void;
}): React.JSX.Element;
```

Convenciones:

- **Lienzo.** La lógica trabaja en 800×600 (4:3) y el canvas se escala por CSS dentro de `.crt-screen`:
  - Franja de HUD de 800×50 en `y = 0`.
  - Tablero de 32×22 celdas de 25 px (800×550) en `y = 50`.
- **Constantes** (nuevas, sin referencia):
  - Rejilla: `COLS = 32`, `ROWS = 22`, `CELL = 25`, `HUD_H = 50`.
  - Serpiente: `START_LENGTH = 3`, `START_CELL = { x: 16, y: 11 }` (cabeza), dirección inicial `right`.
  - Velocidad: `START_TICK = 150` ms, `TICK_STEP = 10` ms por nivel, `MIN_TICK = 60` ms.
  - Niveles y vidas: `FRUITS_PER_LEVEL = 5`, `START_LIVES = 3`, `DEAD_DELAY = 1000` ms.
  - Puntos: `FRUIT_POINTS = 10`, `GOLDEN_POINTS = 50` (ambos × nivel).
  - Fruta dorada: `GOLDEN_CHANCE = 0.15`, `GOLDEN_TTL = 5000` ms, `GOLDEN_BLINK = 1500` ms (parpadea en el último tramo).
  - `MAX_QUEUE = 2`, `MAX_DT = 50` ms.
- **Movimiento.** Igual que el auto-drop de APILA: cuando `tickAccum >= tickInterval`, se resta `tickInterval` y la serpiente avanza una celda. Antes de avanzar se consume un giro de `dirQueue`, si lo hay.
- **Cola de giros.** Un giro se encola si la cola tiene menos de 2 elementos y no es igual ni opuesto a la última dirección encolada (o a `dir` si la cola está vacía).
- **Colisión.** Al avanzar, la cabeza nueva choca si sale de `0..COLS−1` × `0..ROWS−1`, o si ocupa una celda del cuerpo. La cola cuenta como libre si ese tic no crece, porque se desplaza.
- **Crecimiento.** Comer suma 1 a `growPending`. Mientras `growPending > 0`, la cola no se retira y `growPending` baja en 1.
- **Aparición de frutas.** Se elige una celda libre al azar con distribución uniforme (sin serpiente ni otra fruta), y la fruta normal toma un tipo al azar entre los 4. Si no queda ninguna celda libre para la fruta normal, el estado pasa a `won`.
- **Fruta dorada.** Su `ttl` solo baja en `update`, así que la pausa lo congela. Desaparece al agotarse o al perder una vida.
- **Vida perdida.**
  - `lives − 1`. Si queda alguna, el estado pasa a `dead` durante `DEAD_DELAY`. En el canvas se ve "¡CHOQUE!" y las vidas restantes, y la serpiente chocada en `--magenta`.
  - Después, la serpiente reaparece en `START_CELL` con 3 segmentos mirando a la derecha, con la cola de giros vacía y `tickAccum = 0`. Si la fruta normal queda bajo la serpiente nueva, se recoloca.
  - Si `lives` llega a 0, el estado pasa directamente a `gameover`.
- **Sprites de frutas.** Cada `FruitKind` y la dorada son una matriz de 8×8 en `engine.ts` (0 = transparente, 1 = color principal, 2 = hoja o tallo, 3 = brillo). Se dibujan con píxeles de 3 px, centrados en la celda de 25 px. Son diseño propio: no se copian de ningún juego.
- **Paleta.** Constantes en `engine.ts` con los valores de los tokens de `app/globals.css`, con glow vía `shadowBlur`:
  - Serpiente: cabeza `--green` con glow y un píxel de ojo `--bg` en la dirección de avance. Cuerpo `--green` con alpha que baja de 1 a 0,45 hacia la cola.
  - Frutas: manzana `--magenta`, cereza `--bronze`, uva `--cyan` y limón `--yellow`. Hoja o tallo en `--green` y brillo en `--ink`.
  - Fruta dorada en `--gold` con más glow. Parpadea en sus últimos 1,5 s.
  - Rejilla en `--ink-faint` con `lineWidth = 0.5` y `globalAlpha = 0.35`. Fondo del tablero `--bg` y muro (borde del tablero) en `--line` con 2 px.
  - HUD: etiquetas en `--ink-dim`, valores en `--yellow` y corazones en `--magenta`.
  - Textos de los overlays en `--ink`. "GAME OVER" y "¡CHOQUE!" en `--magenta`, "¡TABLERO COMPLETO!" en `--gold`.
- **Input.**
  - `keydown` en `window`. Se ignoran eventos cuyo `target` sea `input`, `textarea` o `contentEditable`.
  - `preventDefault()` en `ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`, `KeyW`, `KeyA`, `KeyS`, `KeyD`, `Space`, `KeyP` y `Escape`. No hay `keyup`.
  - En `ready`, `gameover` y `won`, Espacio arranca o reinicia la partida. Las flechas no arrancan.
  - En `playing`, Espacio no hace nada. En `dead` se ignoran las teclas de dirección.
- **Pausa.** `P` y `Escape` alternan la pausa solo en `playing`. Con `paused: true` el loop dibuja el último frame sin `update` y las teclas de dirección no encolan. Al reanudar se reinicia `lastTime`, así que `dt` no acumula.
- **Snapshot.**
  - `lives` es el número de vidas, y el HUD de la plataforma las muestra como corazones.
  - `level` es el nivel del juego.
  - `onChange` se llama al crear con (`ready`, 0, 3, 1, `paused: false`).
- **Otros.**
  - El motor no carga imágenes ni lee `localStorage`.
  - Números en el canvas con `toLocaleString("es-ES")`, igual que el HUD de la plataforma.

## Plan de implementación

Cada paso deja el sistema funcionando y termina con su **Prueba manual**.

1. **Ficha y portada.**
   - Añadir `"cover-vibora"` a `CoverClass` y la ficha VÍBORA al final de `GAMES`.
   - Añadir `.cover-vibora` en `app/globals.css`, junto a las demás portadas, diseñada con `/frontend-design`:
     - Una víbora pixelada en zigzag, con frutas neón y una fruta dorada destacada.
     - Debe distinguirse a simple vista de `.cover-snake` (serpiente verde recta con un punto magenta).
   - Cambiar el stat de `lib/home.ts` de "10" a "11".
   - Prueba manual: `/biblioteca` muestra 11 tarjetas, `/juegos/vibora` muestra el Detalle y `/juegos/vibora/jugar` abre la partida simulada.
2. **Migración del CHECK.**
   - `npx supabase migration new scores_game_vibora` con el SQL del modelo de datos.
   - `npm run db:push` y `npm run db:types`.
   - Prueba manual: `npx supabase migration list --remote` la muestra en Local y Remote. Un insert con `'vibora'` funciona y uno con `'pong'` sigue fallando.
3. **Motor (jugabilidad).**
   - Crear `games/vibora/engine.ts` con las constantes, los tipos, `spawnFruit`, `maybeSpawnGolden`, `enqueueDir`, `step` (avance, colisión, comer, crecer), `loseLife` y `respawn`.
   - Dibujar el tablero, la rejilla, el muro, la serpiente, las frutas con sus matrices 8×8 y el HUD superior en el canvas de 800×600.
   - El estado vive en el closure de `createViboraEngine`. No se accede a `window` ni a `document` al importar.
   - Prueba manual: `npx tsc --noEmit` y `npm run lint` pasan.
4. **Ciclo de vida, estados e input.**
   - Añadir el estado `ready` con su overlay.
   - Añadir `dead` con su retardo de 1 s, el GAME OVER en canvas, `won` y el reinicio con Espacio.
   - Añadir la pausa (`P`, `Escape`, `visibilitychange`, `pause()`/`resume()`) y `reset()`.
   - Añadir `destroy()`, el limitador de `dt` a 50 ms y el input con `preventDefault` que ignora campos de texto.
   - Emitir `onChange` solo cuando cambia algún campo del snapshot.
   - Prueba manual: `npx tsc --noEmit` pasa.
5. **Componente canvas.**
   - Crear `games/vibora/canvas.tsx` copiando el patrón de `games/apila/canvas.tsx`, con `<canvas width={800} height={600}>`.
   - Prueba manual: `npx tsc --noEmit` y `npm run lint` pasan.
6. **Integración en el reproductor.**
   - Añadir la entrada `vibora` a `GAME_REGISTRY`.
   - Prueba manual:
     - En `/juegos/vibora/jugar` se ve "PULSA ESPACIO PARA EMPEZAR" y el HUD muestra ♥ ♥ ♥.
     - Espacio arranca la partida, y comer una fruta en nivel 1 suma 10 en el canvas y en el HUD.
     - FIN abre el modal con esa puntuación, y GUARDAR crea una fila en `public.scores` con `game_id = 'vibora'`.
7. **Paleta neón.**
   - Aplicar los colores por rol de las convenciones, con glow, y el parpadeo de la fruta dorada.
   - Prueba manual: cada tipo de fruta tiene su color, la dorada brilla y parpadea antes de desaparecer, y la serpiente se desvanece hacia la cola.

## Criterios de aceptación

- [ ] `npm run build`, `npm run lint` y `npx tsc --noEmit` terminan sin errores.
- [ ] `/juegos/vibora` y `/juegos/vibora/jugar` se prerenderizan como las demás rutas de `/juegos/[id]`, y `/salon` sigue siendo estática.
- [ ] `/biblioteca` muestra 11 tarjetas. VÍBORA es la última y aparece con el filtro ARCADE junto a SERPENTINA.
- [ ] La portada `cover-vibora` se ve en la tarjeta y en el Detalle, y no es idéntica a `cover-snake` ni a ninguna otra.
- [ ] El primer stat de la Home dice "11" / "JUEGOS" / "Y CONTANDO", y el rail sigue mostrando los mismos 6 juegos.
- [ ] El Salón de la Fama muestra una pestaña VÍBORA, y "TODOS LOS JUEGOS" tiene 11 filas.
- [ ] `npx supabase migration list --remote` muestra la migración `scores_game_vibora` aplicada en Local y Remote, y un insert con un `game_id` fuera de la lista sigue fallando.
- [ ] Al abrir `/juegos/vibora/jugar`, el canvas muestra "VÍBORA" y "PULSA ESPACIO PARA EMPEZAR". La serpiente no se mueve, la puntuación del HUD es 0, Vidas muestra ♥ ♥ ♥ y Nivel muestra 01.
- [ ] El canvas muestra la franja de HUD (PUNTOS, FRUTAS, NIVEL, VIDAS) encima de un tablero de 32×22 celdas con muro.
- [ ] Tras pulsar Espacio:
  - La serpiente de 3 segmentos avanza hacia la derecha.
  - Las flechas y WASD la giran.
  - Pulsar la dirección opuesta a la actual no hace nada.
- [ ] Dos giros pulsados dentro del mismo tic (p. ej. `↑` y `←` yendo a la derecha) se ejecutan los dos, en tics consecutivos.
- [ ] Pulsar flechas, WASD, Espacio, `P` o `Escape` no hace scroll de la página.
- [ ] Puntuación:
  - Comer una fruta normal suma 10 × nivel y alarga la serpiente 1 segmento.
  - Comer una fruta dorada suma 50 × nivel y alarga 1 segmento.
  - La puntuación del HUD de la plataforma coincide con la del canvas.
- [ ] Siempre hay exactamente una fruta normal, nunca sobre la serpiente. Durante una partida aparecen los 4 tipos (manzana, cereza, uva y limón).
- [ ] La fruta dorada aparece a veces tras comer una normal, parpadea en su último 1,5 s y desaparece a los 5 s si no se come. Nunca hay dos a la vez.
- [ ] Al comer la 5.ª fruta, el nivel pasa a 2 en el canvas y en el HUD de la plataforma, y la serpiente se mueve más rápido.
- [ ] Chocar con el muro o con el propio cuerpo:
  - Quita una vida en el canvas y en el HUD.
  - Muestra "¡CHOQUE!" durante 1 s.
  - Reaparece la serpiente en el centro con 3 segmentos, conservando la puntuación, las frutas y el nivel.
- [ ] Avanzar hacia la celda que acaba de dejar la cola (sin crecer) no cuenta como choque.
- [ ] Al perder la tercera vida, el canvas muestra "GAME OVER" con la puntuación, Vidas muestra "—" y el modal no se abre solo. Espacio inicia una partida nueva con 0 puntos, 0 frutas, nivel 1 y 3 vidas.
- [ ] `P`, `Escape` y el botón PAUSA pausan y muestran "EN PAUSA". La serpiente se detiene y la fruta dorada no consume su tiempo. Repetirlos (o REANUDAR) reanuda sin que la serpiente salte celdas.
- [ ] Cambiar de pestaña durante la partida la deja en pausa al volver.
- [ ] FIN pausa el motor y abre "FIN DEL JUEGO" con la puntuación actual, o con la final si ya hubo GAME OVER.
- [ ] En el modal se pueden escribir iniciales con espacios y letras W/A/S/D sin que la serpiente se mueva ni la página haga scroll.
- [ ] GUARDAR PUNTUACIÓN crea exactamente una fila en `public.scores` con `game_id = 'vibora'`, el nombre del input y la puntuación mostrada.
- [ ] Tras guardar, `/salon` muestra la puntuación en la pestaña VÍBORA y en la fila VÍBORA de "TODOS LOS JUEGOS".
- [ ] JUGAR DE NUEVO cierra el modal y deja el canvas en "PULSA ESPACIO PARA EMPEZAR" con 0 puntos, nivel 1 y 3 vidas.
- [ ] Al salir con SALIR y volver a entrar solo hay un loop activo: la serpiente va a la velocidad normal y la consola no muestra errores.
- [ ] Colores: serpiente verde con la cola desvanecida, manzana magenta, cereza bronce, uva cyan, limón amarillo y fruta dorada `--gold`.
- [ ] La pestaña Network no muestra peticiones de imágenes del juego (frutas dibujadas por código).
- [ ] ASTEROIDES, APILA, SERPENTINA y el resto de juegos se comportan exactamente igual que antes.

## Decisiones

- **Sí:** juego original sin referencia. No hay carpeta en `references/started-games/`; las mecánicas salen de las respuestas del usuario. Solo se toma el género, no el nombre, el arte ni el aspecto de ningún juego comercial.
- **Sí:** ficha nueva VÍBORA (`id: "vibora"`, ARCADE, `magenta`), al final de `GAMES`. Es lo que eligió el usuario. Al ir al final no altera el rail de la Home, y el magenta la distingue de SERPENTINA (`green`) en el filtro ARCADE.
- **No:** sustituir la ficha SERPENTINA, que sigue simulada.
- **Sí:** portada propia `cover-vibora`. Dos portadas de serpiente parecidas confundirían en la Biblioteca.
- **Sí:** stat de la Home a "11" (mismo criterio que SPEC 04 y SPEC 06).
- **Sí:** migración nueva para el CHECK. **No:** quitar el CHECK (SPEC 05 lo decidió para bloquear ids inexistentes).
- **Sí:** frutas neón propias, dibujadas por código como matrices 8×8 con los tokens del vault.
- **No:** usar `fruits.png`/`sprites.js`. Son arte del juego de serpiente de Google sin derechos de uso, y además el atlas está mal etiquetado.
- **No:** un único núcleo abstracto. El usuario quiere variedad de frutas.
- **Sí:** 4 tipos de fruta con el mismo valor. La variedad es visual. **No:** valor por tipo (no se pidió).
- **Sí:** el borde es un muro que quita una vida. **No:** atravesar bordes (wrap).
- **Sí:** nivel cada 5 frutas, con el tic de 150 ms a 60 ms (−10 ms por nivel). Da una progresión visible en el HUD y llega al tope en el nivel 10.
- **Sí:** las frutas doradas cuentan para el nivel. Así una fruta siempre es una fruta y la regla es más simple.
- **Sí:** 3 vidas, con reaparición en el centro y longitud inicial, conservando puntuación, frutas y nivel. Usa el HUD de vidas de la plataforma.
- **No:** una sola vida con "—" en el HUD.
- **Sí:** estado `dead` de 1 s antes de reaparecer, como en ASTEROIDES. Deja ver el choque.
- **Sí:** fruta normal 10 × nivel y fruta dorada (15 %, 5 s, 50 × nivel) además de la normal, nunca dos doradas a la vez. Premia el riesgo sin cambiar la regla básica.
- **Sí:** el tiempo de la dorada se congela en pausa, porque solo avanza en `update`.
- **Sí:** tablero de 32×22 celdas de 25 px bajo una franja de HUD de 50 px. Ocupa exactamente 800×600 (4:3) sin bandas.
- **Sí:** flechas y WASD, sin giro de 180° y con una cola de 2 giros. Así no se pierden pulsaciones rápidas entre tics.
- **Sí:** estado `won` si el tablero se llena (con texto "¡TABLERO COMPLETO!"). Es casi imposible, pero sin él la aparición de fruta no tendría salida. Sigue el default del contrato.
- **Sí:** se mantienen todos los defaults de SPEC 04: estado `ready`, GAME OVER en el canvas con Espacio, pausa en el motor con `P`/`Escape`, HUD doble y modal solo con FIN.
- **Sí:** FIN congela la puntuación y JUGAR DE NUEVO llama a `reset()`, igual que en SPEC 04 y SPEC 06.
- **Sí:** movimiento por acumulador de tics dentro del rAF, con `dt` limitado a 50 ms. **No:** `setInterval`, que no se pausa con el loop.
- **Sí:** las frutas comidas solo se ven en el canvas. El snapshot se queda con los campos del contrato.
- **Sí:** motor `createViboraEngine(canvas, onChange)` en `games/vibora/`, con el mismo patrón que ASTEROIDES y APILA. Se registra en `GAME_REGISTRY` sin tocar `GamePlayer`.
- **Sí:** la puntuación se guarda en `public.scores` con el flujo de SPEC 05. El motor no conoce Supabase.
- **Sí:** los textos `short`/`long` y los `best`/`plays` de la ficha los redacta la spec, y el usuario los ajusta al revisar.

## Riesgos

| Riesgo                                                                 | Mitigación                                                                                                          |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Dos giros rápidos en el mismo tic producen un giro de 180° y un choque | Cola de giros validada contra la última dirección encolada, no solo contra `dir`. Hay un criterio que lo comprueba. |
| La cola se cuenta como obstáculo y provoca choques injustos            | La celda de la cola cuenta como libre si ese tic no crece. Hay un criterio de aceptación.                           |
| La fruta aparece sobre la serpiente o tarda en encontrar hueco         | Se elige entre la lista de celdas libres, no por reintentos al azar.                                                |
| La serpiente reaparece encima de la fruta                              | La fruta normal se recoloca si queda bajo la serpiente nueva.                                                       |
| Olvidar el CHECK hace fallar el guardado                               | La migración va en el paso 2, antes de la integración. El fallo es visible ("ERROR AL GUARDAR").                    |
| WASD mueve la serpiente al escribir iniciales en el modal              | Se ignoran `input`/`textarea`/`contentEditable`, y el motor está pausado con el modal abierto.                      |
| Strict Mode monta dos veces y deja dos loops                           | El motor se crea en `useEffect` con `destroy()` en el cleanup. Hay un criterio de un solo loop.                     |
| El motor toca `window` al importarse y rompe el prerender              | Solo se accede dentro de `createViboraEngine`, que se llama en `useEffect`.                                         |
| `onChange` en cada frame provoca 60 renders/s                          | Se compara con el último snapshot emitido.                                                                          |
| El glow (`shadowBlur`) en cientos de segmentos baja los FPS            | Glow solo en la cabeza y las frutas. El cuerpo se dibuja sin `shadowBlur`.                                          |
| Las frutas de 8×8 a 3 px no quedan centradas en celdas de 25 px        | Desplazamiento fijo de 0,5 px y redondeo a enteros. Es aceptable por el estilo pixelado.                            |
| Canvas escalado borroso en pantallas grandes                           | Aceptable por el estilo retro. `devicePixelRatio` irá en otra spec.                                                 |

## Lo que **no** entra en esta spec

- Los sprites de `references/source-assets/snake-assets/`.
- Cambios en la ficha SERPENTINA.
- Wrap, obstáculos, mapas por nivel, dos jugadores y valor de puntos por tipo de fruta.
- Sonido y música.
- Frutas comidas en el HUD de la plataforma.
- Datos reales en el Detalle, en la Home y en `best`/`plays`.
- Controles táctiles, swipe y gamepad virtual.
- Modal automático al GAME OVER.
- Etiquetas del Detalle por juego.
- Anti-trampas, tests automatizados y `devicePixelRatio`.

Cada uno de estos puntos, si llega, va en su propia spec.
