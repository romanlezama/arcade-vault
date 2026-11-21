# SPEC 04 — Juego ASTEROIDES: primer juego real del vault

> **Estado:** Implementado
> **Depende de:** SPEC 01, SPEC 02
> **Fecha:** 2026-11-21
> **Objetivo:** Añadir la ficha ASTEROIDES y ejecutar en `/juegos/asteroides/jugar` el juego de `references/started-games/02-asteroids/`, portado a TypeScript dentro del CRT, notificando a React la puntuación, las vidas, el nivel y el estado.

## Por qué existe esta spec

Hasta ahora `components/game-player.tsx` simula todas las partidas: la puntuación sube sola cada 220 ms. `references/started-games/02-asteroids/` es un juego completo en canvas (un `game.js` de 510 líneas, sin dependencias). Usa globales, `document.getElementById` y listeners en `window` que nunca se limpian. Así no puede vivir dentro de una app de Next.js con navegación cliente. Esta spec lo porta a un módulo TypeScript con ciclo de vida explícito (crear, pausar, reiniciar, destruir). El juego sigue completo dentro del canvas, con su propio HUD y su GAME OVER. React solo lo enmarca, lo controla y refleja su estado.

Es el primer juego real del vault. La carpeta `games/asteroides/` fija el patrón para los siguientes (`03-tetris`, `04-arkanoid`).

## Alcance

**Entra:**

- Nueva ficha en `GAMES` (`lib/games.ts`), en 9.ª posición:
  - `id: "asteroides"`, título "ASTEROIDES", categoría SHOOTER, color `cyan`.
  - Portada nueva `cover-asteroides` en `app/globals.css`.
- Stat de la Home: "8" pasa a "9" (`HOME_STATS` en `lib/home.ts`).
- Motor portado a TypeScript en `games/asteroides/engine.ts`, sin React ni globales:
  - Misma jugabilidad que la referencia: rotar, propulsar, disparar, envolvimiento toroidal, 3 vidas, invencibilidad con parpadeo al reaparecer, asteroides que se parten (3 → 2 → 1), partículas, niveles con `3 + nivel` asteroides.
  - Power-up "3x" (disparo triple) igual que en la referencia: 15 % de probabilidad, garantizado a la 5.ª destrucción, uno por nivel, dura 5 s.
  - Puntos: grande 20, mediano 50, pequeño 100.
  - HUD dibujado en el canvas (SCORE, NIVEL, iconos de vidas, contador 3x), igual que la referencia.
  - Nuevo estado inicial `ready`: el canvas muestra "ASTEROIDES" y "PULSA ESPACIO PARA EMPEZAR". La partida no avanza hasta pulsar Espacio.
  - GAME OVER dentro del canvas, como en la referencia: "GAME OVER" y "PUNTAJE: N — ESPACIO PARA REINICIAR". Espacio reinicia directamente a `playing`.
  - Pausa controlada por el motor: teclas `P` y `Escape`, métodos `pause()`/`resume()`, y pausa automática cuando la pestaña se oculta (`visibilitychange`).
  - Paleta neón del vault en lugar de blanco.
  - Notificación a React vía callback `onChange(snapshot)` cada vez que cambian la puntuación, las vidas, el nivel, el estado o la pausa. No se notifica en cada frame.
  - `destroy()` cancela el `requestAnimationFrame` y retira todos los listeners.
- Componente cliente `games/asteroides/canvas.tsx`:
  - Monta un `<canvas width={800} height={600}>` que llena el `crt-screen` (que ya es 4:3).
  - Crea el motor al montar y lo destruye al desmontar.
  - Expone `pause`, `resume` y `reset` por `ref`.
- Integración en `components/game-player.tsx`:
  - Con `game.id === "asteroides"` monta `<AsteroidesCanvas>` en lugar de la arena simulada. El intervalo de puntuación simulada no corre.
  - El HUD de la plataforma (Puntuación, Vidas, Nivel) muestra los valores del snapshot del motor. El canvas conserva también su HUD.
  - PAUSA/REANUDAR llama a `pause()`/`resume()`. El overlay "EN PAUSA" se muestra según `snapshot.paused`, así que también aparece con `P`, `Escape` o al ocultar la pestaña.
  - FIN pausa el motor y abre el modal "FIN DEL JUEGO" con la puntuación actual. Si ya hubo GAME OVER, es la puntuación final de esa partida.
  - GUARDAR PUNTUACIÓN guarda en `av_scores` con `game: "asteroides"`, igual que hoy.
  - JUGAR DE NUEVO llama a `reset()`, que devuelve el motor a `ready`.
  - Los otros 8 juegos siguen con la partida simulada, sin cambios.

**Fuera de alcance (para specs futuras):**

- Controles táctiles o gamepad virtual. Solo teclado.
- Abrir el modal "FIN DEL JUEGO" automáticamente al llegar a GAME OVER.
- Guardar la puntuación sin pulsar FIN. Si el jugador reinicia con Espacio tras GAME OVER, esa puntuación se pierde.
- Cambiar o retirar la ficha ROCAS, que sigue simulada.
- Ajustar las etiquetas fijas del Detalle ("TECLADO / TÁCTIL", "RETRO 1985", dificultad) por juego.
- Sonido, OVNIs, hiperespacio y cualquier mecánica que no esté en la referencia.
- Puntuaciones en Supabase, ranking real y datos reales en el Salón de la Fama.
- Portar Tetris y Arkanoid (`03-tetris`, `04-arkanoid`).
- Tests automatizados.

## Modelo de datos

```ts
// lib/games.ts — se amplía la unión y se añade la ficha al final de GAMES
export type CoverClass = /* …las 8 actuales… */ | "cover-asteroides";

{
  id: "asteroides",
  title: "ASTEROIDES",
  short: "Pulveriza rocas en un vacío sin bordes.",
  long: "Una nave vectorial flota en un campo de asteroides sin bordes: lo que sale por un lado vuelve por el otro. Cada roca grande se parte en medianas y cada mediana en pequeñas. Atrapa el núcleo 3x para disparar en abanico durante unos segundos.",
  cat: "SHOOTER",
  cover: "cover-asteroides",
  color: "cyan",
  best: 38750,
  plays: "1.2K",
}
```

```ts
// games/asteroides/engine.ts — sin "use client", sin imports de React
export type AsteroidesStatus = "ready" | "playing" | "dead" | "gameover";

export type AsteroidesSnapshot = {
  status: AsteroidesStatus;
  paused: boolean;
  score: number;
  lives: number; // 3 al empezar; 0 en gameover
  level: number; // 1 al empezar
};

export type AsteroidesEngine = {
  pause(): void; // solo tiene efecto en playing/dead
  resume(): void;
  reset(): void; // vuelve a ready con score 0, 3 vidas, nivel 1
  destroy(): void; // cancela rAF y retira listeners de window/document
};

export function createAsteroidesEngine(
  canvas: HTMLCanvasElement,
  onChange: (snapshot: AsteroidesSnapshot) => void,
): AsteroidesEngine;
```

```ts
// games/asteroides/canvas.tsx — "use client"
export type AsteroidesHandle = Pick<
  AsteroidesEngine,
  "pause" | "resume" | "reset"
>;

export function AsteroidesCanvas(props: {
  ref?: React.Ref<AsteroidesHandle>;
  onChange: (snapshot: AsteroidesSnapshot) => void;
}): React.JSX.Element;
```

Convenciones:

- La lógica sigue en coordenadas 800×600. El canvas se escala por CSS (`width: 100%; height: 100%; display: block`) dentro de `.crt-screen`.
- Las constantes de la referencia (`RADII`, `SPEEDS`, `POINTS`, `ROT`, `THRUST`, `DRAG`, cooldown 0,2 s, `dt` máximo 50 ms, etc.) se conservan con los mismos valores.
- Paleta (constantes en `engine.ts` con los mismos valores que los tokens de `app/globals.css`):
  - Nave e iconos de vidas: `--cyan`.
  - Asteroides: `--magenta`.
  - Balas: `--yellow`.
  - Power-up "3x" y su contador: `--green`.
  - Partículas: `--magenta` con alfa decreciente.
  - Llama del propulsor: naranja, como en la referencia.
  - Textos del HUD y overlays: `--ink`.
  - Glow con `shadowBlur`.
- Input: el motor escucha `keydown`/`keyup` en `window`. Ignora eventos cuyo `target` sea `input`, `textarea` o `contentEditable`, para que el modal pueda escribir iniciales con espacios.
- El motor llama a `preventDefault()` en `ArrowLeft`, `ArrowRight`, `ArrowUp`, `Space`, `KeyP` y `Escape` para que la página no haga scroll.
- `P` y `Escape` alternan la pausa solo en `playing`/`dead`.
- Con `paused: true`, el loop sigue dibujando el último frame pero no llama a `update`. Al reanudar, `dt` no acumula el tiempo pausado.
- `onChange` se llama una vez al crear el motor con el snapshot inicial (`ready`, 0, 3, 1, `paused: false`).

## Plan de implementación

1. **Ficha y portada.**
   - Añadir `"cover-asteroides"` a `CoverClass` y la ficha ASTEROIDES al final de `GAMES`.
   - Añadir `.cover-asteroides` en `app/globals.css`, junto a las demás portadas:
     - Fondo espacial oscuro.
     - Contornos de rocas en magenta.
     - Una nave "▲" cyan con glow y puntos amarillos de disparo.
     - Debe distinguirse a simple vista de `.cover-rocas`.
   - Cambiar el stat de `lib/home.ts` de "8" a "9".
   - Prueba manual: `/biblioteca` muestra 9 tarjetas, `/juegos/asteroides` muestra el Detalle y `/juegos/asteroides/jugar` abre la partida simulada.
2. **Port del motor (jugabilidad).**
   - Crear `games/asteroides/engine.ts` con `Bullet`, `Asteroid`, `PowerUp`, `Ship` y `Particle` portadas a TS.
   - El estado del juego vive dentro del closure de `createAsteroidesEngine`. `ctx` se pasa a los `draw`.
   - No se accede a `window` ni a `document` al importar el módulo.
   - Prueba manual: `npx tsc --noEmit` y `npm run lint` pasan.
3. **Ciclo de vida, estados e input.**
   - Añadir el estado `ready` con su overlay.
   - Añadir el GAME OVER en canvas y el reinicio con Espacio.
   - Añadir la pausa (`P`, `Escape`, `visibilitychange`, `pause()`/`resume()`) y `reset()`.
   - Añadir `destroy()` y el input con `preventDefault` que ignora campos de texto.
   - Emitir `onChange` solo cuando cambia algún campo del snapshot.
   - Prueba manual: `npx tsc --noEmit` pasa.
4. **Componente canvas.**
   - Crear `games/asteroides/canvas.tsx` (`"use client"`).
   - En un `useEffect`, crear el motor con el `<canvas>` y destruirlo en el cleanup.
   - Exponer `pause`/`resume`/`reset` con `useImperativeHandle`.
   - Guardar `onChange` en una ref para no recrear el motor cuando cambie la función.
   - Prueba manual: `npx tsc --noEmit` y `npm run lint` pasan.
5. **Integración en el reproductor.**
   - En `components/game-player.tsx`, si `game.id === "asteroides"`:
     - Renderizar `<AsteroidesCanvas>` dentro de `.crt-screen`.
     - Alimentar el HUD con el snapshot.
     - Conectar PAUSA, FIN y JUGAR DE NUEVO al handle.
     - Desactivar el intervalo simulado.
   - Para el resto de juegos el comportamiento queda igual.
   - Prueba manual:
     - En `/juegos/asteroides/jugar` se ve "PULSA ESPACIO PARA EMPEZAR".
     - Espacio arranca la partida y destruir una roca grande suma 20 en el canvas y en el HUD.
     - FIN abre el modal con esa puntuación.
6. **Paleta neón.**
   - Sustituir los colores blancos del motor por la paleta de las convenciones, con glow.
   - Prueba manual: nave cyan, asteroides magenta, balas amarillas y power-up verde.

## Criterios de aceptación

- [ ] `npm run build`, `npm run lint` y `npx tsc --noEmit` terminan sin errores.
- [ ] `/juegos/asteroides` y `/juegos/asteroides/jugar` se prerenderizan como las demás rutas de `/juegos/[id]`.
- [ ] `/biblioteca` muestra 9 tarjetas. ASTEROIDES es la última y aparece con el filtro SHOOTER junto a INVASORES y ROCAS.
- [ ] La portada `cover-asteroides` se ve en la tarjeta y en el Detalle, y no es idéntica a `cover-rocas`.
- [ ] El rail de la Home sigue mostrando exactamente los mismos 6 juegos que antes.
- [ ] El primer stat de la Home dice "9" / "JUEGOS" / "Y CONTANDO".
- [ ] El Salón de la Fama muestra una pestaña ASTEROIDES.
- [ ] Al abrir `/juegos/asteroides/jugar`, el canvas muestra "ASTEROIDES" y "PULSA ESPACIO PARA EMPEZAR". Los asteroides no se mueven y la puntuación del HUD es 0.
- [ ] Tras pulsar Espacio, `←` `→` rotan la nave, `↑` la propulsa y Espacio dispara.
- [ ] Pulsar flechas o Espacio durante la partida no hace scroll de la página.
- [ ] Destruir asteroides suma 20 (grande), 50 (mediano) y 100 (pequeño), y la puntuación del HUD de la plataforma coincide con la del canvas.
- [ ] Perder una vida actualiza las vidas en el canvas y en el HUD de la plataforma (♥ ♥ ♥ → ♥ ♥).
- [ ] Al limpiar todos los asteroides, el nivel sube en el canvas y en el HUD de la plataforma.
- [ ] El power-up "3x" aparece como mucho una vez por nivel. Al recogerlo, la nave dispara 3 balas durante 5 s.
- [ ] Al perder la última vida, el canvas muestra "GAME OVER" con la puntuación y el modal no se abre solo. Espacio inicia una partida nueva con 0 puntos, 3 vidas y nivel 1.
- [ ] `P`, `Escape` y el botón PAUSA pausan la partida y muestran "EN PAUSA". Repetirlos (o REANUDAR) la reanuda sin que la nave salte.
- [ ] Cambiar de pestaña durante la partida la deja en pausa al volver.
- [ ] FIN pausa el motor y abre "FIN DEL JUEGO" con la puntuación actual, o con la final si ya hubo GAME OVER.
- [ ] En el modal se pueden escribir iniciales con espacios sin que la nave dispare ni la página haga scroll.
- [ ] GUARDAR PUNTUACIÓN añade a `av_scores` una entrada con `game: "asteroides"` y la puntuación mostrada.
- [ ] JUGAR DE NUEVO cierra el modal y deja el canvas en "PULSA ESPACIO PARA EMPEZAR" con 0 puntos, 3 vidas y nivel 1.
- [ ] Al salir con SALIR y volver a entrar, solo hay un loop activo: la velocidad del juego es la normal y la consola no muestra errores.
- [ ] La nave es cyan, los asteroides magenta, las balas amarillas y el power-up verde.
- [ ] `/juegos/caida/jugar` (y el resto de juegos) siguen con la partida simulada exactamente como antes.

## Decisiones

- **Sí:** ficha nueva ASTEROIDES (`id: "asteroides"`), al final de `GAMES`. Es lo que pidió el usuario. Al ir al final no altera el rail de la Home.
- **No:** reutilizar la ficha ROCAS. ROCAS sigue como juego simulado.
- **Sí:** portada propia `cover-asteroides`. Dos portadas idénticas confundirían en la Biblioteca.
- **Sí:** stat de la Home a "9". La Home no debe contar mal los juegos (mismo criterio que en SPEC 02).
- **Sí:** portar a TypeScript con `createAsteroidesEngine(canvas, onChange)`. Da ciclo de vida explícito, limpieza al navegar y tipos.
- **No:** iframe con el HTML original en `public/`. Comunicar la puntuación exigiría `postMessage`.
- **No:** cargar `game.js` con `<Script>`. Deja globales y listeners imposibles de limpiar.
- **Sí:** el juego completo queda dentro del canvas (HUD propio y GAME OVER propio) y notifica a React. Respeta el juego tal como está.
- **Sí:** HUD doble. El HUD de la plataforma refleja los mismos datos que el canvas.
- **No:** quitar el HUD del canvas.
- **Sí:** el modal solo se abre con FIN. GAME OVER se queda en el canvas con Espacio para reiniciar.
- **No:** abrir el modal automáticamente al morir. El usuario prefirió conservar el GAME OVER original.
- **Sí:** FIN congela la puntuación: el modal muestra y guarda la puntuación del momento en que se pulsó FIN. `pause()` no tiene efecto en `ready`/`gameover` y el motor sigue escuchando el teclado tras el modal (Espacio podría reiniciar o empezar una partida detrás); JUGAR DE NUEVO llama a `reset()` igualmente. Decidido durante la implementación (opción 1 de 3).
- **Sí:** estado `ready` con "PULSA ESPACIO PARA EMPEZAR". Evita que la partida arranque antes de que el jugador esté listo.
- **Sí:** el motor es la única fuente de verdad de la pausa, y React la lee de `snapshot.paused`. Así el botón, `P`, `Escape` y `visibilitychange` no se desincronizan.
- **Sí:** `onChange` solo cuando cambia el snapshot. Notificar en cada frame provocaría 60 renders por segundo del reproductor.
- **Sí:** lógica en 800×600 escalada por CSS. `.crt-screen` ya es 4:3 y la física no cambia con el tamaño de pantalla.
- **No:** controles táctiles en esta spec.
- **Sí:** paleta neón con los tokens del vault. Hace al juego coherente con la plataforma.
- **No:** el blanco vectorial original.
- **Sí:** carpeta por juego en la raíz (`games/asteroides/engine.ts` y `games/asteroides/canvas.tsx`). Es el patrón para los próximos juegos reales.
- **No:** `lib/engines/` + `components/`.
- **Sí:** selección en `GamePlayer` por `game.id === "asteroides"`. Con un solo juego real, un registro de motores sería sobreingeniería. Se generalizará cuando llegue el segundo.
- **Sí:** se conservan el power-up 3x y todas las constantes de la referencia. Es parte del juego aunque el README no lo mencione.
- **Sí:** los textos de la ficha los redacta la spec y el usuario los ajusta al revisar.
- **No:** ajustar ahora las etiquetas fijas del Detalle ("TECLADO / TÁCTIL"). Afectan a todos los juegos y merecen su propia spec.

## Riesgos

| Riesgo                                                                                      | Mitigación                                                                                                                                                   |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| React Strict Mode monta, desmonta y vuelve a montar en desarrollo, y podría dejar dos loops | El motor se crea en `useEffect` y `destroy()` en el cleanup cancela el rAF y retira los listeners. Un criterio de aceptación comprueba que solo hay un loop. |
| Los listeners en `window` capturan teclas mientras se escriben las iniciales en el modal    | El motor ignora eventos de `input`, `textarea` y `contentEditable`. Además está pausado mientras el modal está abierto.                                      |
| `preventDefault` de Espacio y flechas bloquea el scroll o el teclado en el resto del sitio  | Los listeners solo existen mientras `/juegos/asteroides/jugar` está montado y se retiran en `destroy()`.                                                     |
| Salto de la nave al reanudar o al volver a la pestaña                                       | `dt` sigue limitado a 50 ms y al reanudar se reinicia `lastTime`.                                                                                            |
| `onChange` dispara renders en cada frame                                                    | El motor compara con el último snapshot emitido y solo notifica si algo cambió.                                                                              |
| El canvas escalado se ve borroso en pantallas grandes                                       | Es aceptable para el estilo retro. Ajustar con `devicePixelRatio` quedaría en otra spec si hiciera falta.                                                    |
| El módulo del motor toca `window` al importarse y rompe el prerender                        | `engine.ts` solo accede a `window`/`document` dentro de `createAsteroidesEngine`, que se llama en `useEffect`.                                               |

## Lo que **no** entra en esta spec

- Controles táctiles y gamepad virtual.
- Modal automático al GAME OVER y guardado sin pulsar FIN.
- Cambios en la ficha ROCAS.
- Etiquetas del Detalle por juego.
- Sonido y mecánicas que no estén en la referencia.
- Puntuaciones en Supabase y ranking real.
- Tetris y Arkanoid.
- Tests automatizados.

Cada uno de estos puntos, si llega, va en su propia spec.
