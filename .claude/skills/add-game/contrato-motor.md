# Contrato del motor y del canvas

Extraído de SPEC 04 y de `games/asteroides/`. Toda spec generada por `/add-game` lo respeta. Si una spec se desvía, debe registrarlo en **Decisiones** con su porqué.

`<id>` es el slug del juego (`caida`, `bloque-buster`…). `<X>` es el nombre en PascalCase usado en los tipos (`Caida`, `BloqueBuster`…).

## Carpeta

```
games/<id>/
  engine.ts   # motor puro, sin React
  canvas.tsx  # componente cliente que monta el motor
  levels.ts   # (opcional) datos portados de la referencia, p. ej. levels.js
public/games/<id>/   # (opcional) assets: imágenes, spritesheets, sonidos
```

## `games/<id>/engine.ts`

- Sin `"use client"` y sin imports de React.
- **No accede a `window` ni a `document` al importar el módulo.** Todo acceso ocurre dentro de `create<X>Engine`, que se llama en un `useEffect`. Así no rompe el prerender.
- El estado del juego vive en el closure de `create<X>Engine`. `ctx` se pasa a las funciones de dibujo.
- Las clases o entidades de la referencia se portan a TS con tipos explícitos.

```ts
export type <X>Status = "ready" | "playing" | "gameover"; // + "dead", "won", "levelup"… si el juego los tiene

export type <X>Snapshot = {
  status: <X>Status;
  paused: boolean;
  score: number;
  lives: number;  // lo que el HUD muestra como vidas
  level: number;  // lo que el HUD muestra como nivel
  // extras propios del juego (lines, combo…) si la plataforma los necesita
};

export type <X>Engine = {
  pause(): void;   // solo tiene efecto mientras se juega
  resume(): void;
  reset(): void;   // vuelve a "ready" con los valores iniciales
  destroy(): void; // cancela el rAF y retira todos los listeners
};

export function create<X>Engine(
  canvas: HTMLCanvasElement,
  onChange: (snapshot: <X>Snapshot) => void,
): <X>Engine;
```

Los campos `status`, `paused`, `score`, `lives` y `level` son obligatorios: son los que consume `GamePlayer` (HUD, overlay EN PAUSA y modal FIN DEL JUEGO).

### Comportamiento obligatorio

- **Coordenadas fijas.** La lógica trabaja en un tamaño fijo (800×600 por defecto, o el que encaje en 4:3). El `<canvas>` se escala por CSS (`width: 100%; height: 100%; display: block`) dentro de `.crt-screen`.
- **Constantes.** Velocidades, tamaños, tiempos, probabilidades y puntos de la referencia se conservan con los mismos valores.
- **Estado `ready`.** Al crear el motor, el canvas muestra el título del juego y "PULSA ESPACIO PARA EMPEZAR". Nada avanza hasta pulsar Espacio.
- **GAME OVER en el canvas.** "GAME OVER" y "PUNTAJE: N — ESPACIO PARA REINICIAR". Espacio reinicia directamente a `playing`. El modal de la plataforma no se abre solo.
- **Victoria** (si el juego puede terminarse): estado `won` en el canvas con la puntuación y Espacio para reiniciar, salvo que la spec decida otra cosa.
- **Pausa en el motor.** `P` y `Escape` alternan la pausa solo mientras se juega. `visibilitychange` pausa al ocultar la pestaña. Con `paused: true` el loop sigue dibujando el último frame pero no llama a `update`.
- **Tiempo.** `dt` limitado a 50 ms. Al reanudar se reinicia `lastTime` para no acumular el tiempo pausado. Si la referencia usa `setInterval` para la caída/tics, se pasa a acumuladores dentro del rAF.
- **`onChange`.** Se llama una vez al crear con el snapshot inicial y después solo cuando cambia algún campo. Nunca en cada frame.
- **Teclado.** `keydown`/`keyup` en `window`. Se ignoran eventos cuyo `target` sea `input`, `textarea` o `contentEditable` (el modal escribe iniciales con espacios). `preventDefault()` en las teclas del juego (flechas, Espacio, `P`, `Escape`…) para que la página no haga scroll.
- **Ratón** (si el juego lo usa): listeners en el `canvas`, no en `window`. Convertir coordenadas con `canvas.getBoundingClientRect()` y la escala `canvas.width / rect.width`, porque el canvas está escalado por CSS.
- **Assets** (si los hay): se sirven desde `public/games/<id>/` y se cargan con `new Image()` / `new Audio()` dentro de `create<X>Engine`. El juego no arranca (o dibuja un fallback) hasta que la imagen ha cargado. Los sonidos fallan en silencio si el navegador bloquea el autoplay.
- **UI fuera del canvas.** Lo que la referencia mostraba en el DOM (siguiente pieza, marcador, overlays HTML) se dibuja en el canvas o se refleja en el HUD de la plataforma. El motor no crea ni lee elementos del DOM.
- **`destroy()`.** Cancela el rAF, retira todos los listeners de `window`, `document` y `canvas`, y pausa los sonidos.

### Paleta

Constantes en `engine.ts` con los mismos valores que los tokens de `app/globals.css` (`--cyan`, `--magenta`, `--yellow`, `--green`, `--ink`…), con glow vía `shadowBlur`. Asigna un color por rol (jugador, enemigos/bloques, proyectiles, power-ups, textos) y recógelo en las Convenciones de la spec. Si el usuario elige sprites originales, se documenta como decisión.

## `games/<id>/canvas.tsx`

Copia del patrón de `games/asteroides/canvas.tsx`:

```tsx
"use client";
export type <X>Handle = Pick<<X>Engine, "pause" | "resume" | "reset">;

export function <X>Canvas({ ref, onChange }: {
  ref?: React.Ref<<X>Handle>;          // React 19: ref como prop
  onChange: (snapshot: <X>Snapshot) => void;
}) { /* … */ }
```

- Crea el motor en un `useEffect` con `[]` y lo destruye en el cleanup (Strict Mode monta dos veces: solo debe quedar un loop).
- Guarda `onChange` en una ref para no recrear el motor cuando cambie la función.
- Expone `pause`/`resume`/`reset` con `useImperativeHandle`.
- Renderiza `<canvas width={W} height={H} style={{ width: "100%", height: "100%", display: "block" }} />`.

## Leaderboard

El motor **no** habla con Supabase. La puntuación llega a `GamePlayer` por el snapshot; al pulsar FIN se congela y el modal la guarda con `insertScore({ gameId, playerName, score })` de `lib/scores-db.ts`. El Salón de la Fama (`components/hall-of-fame.tsx`) y la tabla "TODOS LOS JUEGOS" (`components/games-summary.tsx`) salen de `GAMES` y de `lib/leaderboard.ts`, así que no necesitan cambios por juego. Lo único que depende del juego es que su `id` esté en el CHECK `scores_game_id_check`.
