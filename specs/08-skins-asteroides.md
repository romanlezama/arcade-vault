# SPEC 08 — Skins de ASTEROIDES: CLÁSICO, NEÓN y RETRO (y contrato de skins)

> **Estado:** Implementado
> **Depende de:** SPEC 04, SPEC 06
> **Fecha:** 2026-11-22
> **Objetivo:** Que ASTEROIDES se pueda jugar con tres skins (`clasico` por defecto, `neon` y `retro`), todas legibles sobre fondo oscuro, elegibles desde el reproductor y persistidas en `localStorage`. Como es la primera spec de skins, define además el **contrato de skins** que reutilizarán APILA, VÍBORA y los juegos futuros.

## Por qué existe esta spec

Hoy cada motor real tiene una única paleta fija, cableada como constantes (`CYAN`, `MAGENTA`, `YELLOW`, `GREEN`, `INK`, `FLAME` en `games/asteroides/engine.ts`). El vault quiere que cada juego real ofrezca al menos tres aspectos: uno sobrio de arcade original, el neón del vault y uno de fósforo CRT.

ASTEROIDES es el primer juego en recibirlas, así que esta spec fija también cómo se declaran las skins en un motor, cómo llegan al canvas y cómo se elige y guarda la preferencia en `GamePlayer`. Las skins **solo cambian el aspecto**: la jugabilidad, la puntuación, los tiempos y las hitbox no se tocan.

## Auditoría de la paleta actual

`games/asteroides/engine.ts` no tiene `SKINS` ni tipo `Palette`. Pinta con constantes sueltas:

| Sitio de pintado (función)      | Color actual                    | Glow (`shadowBlur`) |
| ------------------------------- | ------------------------------- | ------------------- |
| Fondo (`draw`)                  | `#000` literal                  | 0                   |
| Nave (`Ship.draw`)              | `CYAN` `#00f5ff`                | 12                  |
| Llama del propulsor             | `FLAME` `rgba(255,130,0,0.85)`  | 8                   |
| Asteroides (`Asteroid.draw`)    | `MAGENTA` `#ff006e`             | 10                  |
| Partículas (`Particle.draw`)    | `MAGENTA_RGB` con alfa por vida | 6                   |
| Balas (`Bullet.draw`)           | `YELLOW` `#f5ff00`              | 8                   |
| Power-up 3x: rombo y texto "3x" | `GREEN` `#00ff88`               | 12 / 8              |
| HUD: `SCORE n`, `NIVEL n`       | `INK` `#e6e9ff` (label y valor) | 4                   |
| HUD: iconos de vida             | `CYAN`                          | 8                   |
| HUD: contador `3x  n.ns`        | `GREEN`                         | 8                   |
| Overlay: título                 | `INK`                           | 14                  |
| Overlay: subtítulo              | `rgba(INK, 0.65)`               | 4                   |
| GAME OVER (título)              | `INK` (mismo que el overlay)    | 14                  |

Resultado: solo existe una paleta (equivale a `neon`), sin `clasico` ni `retro`. ASTEROIDES **no tiene rejilla ni borde de tablero**: esos roles no aplican y esta spec no los añade.

## Alcance

**Entra:**

- Contrato de skins común (`games/skins.ts`, ampliación de `games/types.ts` y `games/registry.ts`, store de preferencia `lib/skin.ts`, selector en `GamePlayer`).
- Tipo `AsteroidesPalette` y `SKINS: Record<SkinId, AsteroidesPalette>` en el motor de ASTEROIDES, con las tres paletas de esta spec.
- Sustituir todas las constantes de color y todos los `shadowBlur` fijos del motor por lecturas de la paleta activa.
- `setSkin(id)` en el motor y en el handle del canvas; la skin inicial llega en `createAsteroidesEngine(canvas, onChange, { skin })`.
- Selector de skin en el reproductor, visible solo en juegos que declaran skins.

**Fuera de alcance (para specs futuras):**

- Skins de APILA y VÍBORA (una spec por juego, reutilizando este contrato).
- Scanlines o curvatura dibujadas por el motor (ver Decisiones).
- Cambiar la forma de la nave, los asteroides o el power-up; cambiar fuentes o textos del canvas.
- Preferencia de skin por juego, sincronizada en Supabase o ligada al usuario.
- Skin en la portada, el Detalle o la Biblioteca.
- `devicePixelRatio`, sonido.

## Contrato de skins

Esta es la primera spec de skins: el contrato queda definido aquí y se copia a `references/game-with-themes.md`.

### `games/skins.ts` (nuevo, sin React ni `window`)

```ts
export type SkinId = "clasico" | "neon" | "retro";
export const SKIN_IDS: readonly SkinId[] = ["clasico", "neon", "retro"];
export const SKIN_LABELS: Record<SkinId, string> = {
  clasico: "CLÁSICO",
  neon: "NEÓN",
  retro: "RETRO",
};
export const DEFAULT_SKIN: SkinId = "clasico";
export function isSkinId(value: unknown): value is SkinId; // valida lo leído de localStorage
```

### Motor (`games/<id>/engine.ts`)

- Exporta un tipo de paleta propio del juego (`AsteroidesPalette`) con **un campo por rol** y un factor `glow` (multiplicador de los `shadowBlur` base del motor: 0 = sin glow).
- Exporta `SKINS: Record<SkinId, AsteroidesPalette>`. Todos los colores son hex sólidos `#rrggbb`; las transparencias (partículas que se desvanecen) se derivan en el motor con un helper `rgba(hex, alpha)`.
- Firma: `createXEngine(canvas, onChange, options?: { skin?: SkinId })`. Sin `skin`, usa `DEFAULT_SKIN`.
- El handle añade `setSkin(id: SkinId): void`: cambia la paleta activa y, si el motor está en pausa (el loop no redibuja), redibuja el frame actual con la nueva paleta. No toca ningún estado de juego ni emite snapshot.
- Ningún color ni `shadowBlur` fuera de la paleta. El motor sigue sin leer `getComputedStyle`: los hex del vault se copian a mano con un comentario `// --token`.

### `games/types.ts`

```ts
import type { SkinId } from "./skins";
export type GameHandle = {
  pause(): void;
  resume(): void;
  reset(): void;
  setSkin?(id: SkinId): void; // opcional: los juegos sin skins no lo implementan
};
export type GameCanvasProps = {
  ref?: React.Ref<GameHandle>;
  onChange: (snapshot: GameSnapshot) => void;
  skin?: SkinId; // los juegos sin skins lo ignoran
};
```

### `games/registry.ts`

- `GameEntry` añade `skins?: readonly SkinId[]`. ASTEROIDES declara `skins: SKIN_IDS`. APILA y VÍBORA no lo declaran todavía y siguen igual.

### Canvas (`games/<id>/canvas.tsx`)

- Acepta la prop `skin` (por defecto `DEFAULT_SKIN`).
- Crea el motor en el `useEffect` de montaje con `{ skin }` leída de un ref (para no recrear el motor al cambiar de skin).
- Un segundo `useEffect` con dependencia `[skin]` llama a `engine.setSkin(skin)`.
- El handle expuesto por `ref` incluye `setSkin`.

### Preferencia: `lib/skin.ts` (nuevo, `"use client"`)

- Mismo patrón que `lib/session.ts`: `useSyncExternalStore`, respaldo en memoria si `localStorage` falla, `storage` event para sincronizar pestañas.
- Clave `av_skin`, valor un `SkinId` en texto plano. **Preferencia global**, la misma para todos los juegos con skins.
- `useSkin(): SkinId` → `DEFAULT_SKIN` en el servidor y en el primer render; valor guardado si es válido (`isSkinId`), si no `DEFAULT_SKIN`.
- `setSkinPreference(id: SkinId)` guarda y notifica.

### `components/game-player.tsx`

- Lee `useSkin()` y pasa `skin` a `<entry.Canvas skin={skin} … />`.
- Si `entry?.skins` existe, muestra un selector **SKIN** con un botón por skin (`SKIN_LABELS`), `aria-pressed` en la activa y `setSkinPreference` al pulsar. Tras el clic el botón hace `blur()` para que Espacio siga llegando al juego y no reactive el botón.
- Juegos sin `skins` (APILA, VÍBORA, simulados): no se muestra el selector y todo sigue igual.
- Diseño del selector con `/frontend-design`, coherente con `.hud-actions` / `.btn` (segmented control pequeño, fuente pixel, estado activo con borde/fondo del color del vault).

## Modelo de datos — paletas de ASTEROIDES

### Tipo

```ts
export type AsteroidesPalette = {
  bg: string; // fondo del canvas
  ship: string; // trazo de la nave
  flame: string; // llama del propulsor
  asteroid: string; // trazo de los asteroides
  particle: string; // chispas de explosión (alfa por vida)
  bullet: string; // balas
  powerUp: string; // rombo 3x y su texto
  life: string; // iconos de vida del HUD
  hudLabel: string; // "SCORE", "NIVEL"
  hudValue: string; // número de puntos y de nivel
  hudPowerUp: string; // contador "3x  n.ns"
  overlayTitle: string; // "ASTEROIDES"
  overlaySub: string; // "PULSA ESPACIO…", "PUNTAJE: …"
  gameOver: string; // título "GAME OVER"
  glow: number; // multiplicador de shadowBlur (0 = sin glow)
};
```

Los `shadowBlur` base se quedan como constantes del motor con los valores actuales (nave 12, asteroide 10, bala 8, power-up 12 / texto 8, partícula 6, llama 8, vida 8, HUD 4, contador 3x 8, título 14, subtítulo 4) y se multiplican por `palette.glow`. El color del glow es siempre el del propio elemento.

### Tabla de paletas (hex y contraste WCAG contra el fondo de cada skin)

Ratios calculados con Node (luminancia relativa sRGB). Umbrales §5: texto ≥ 4,5:1; elementos de juego ≥ 3:1; decorativos pueden ser menores.

| Rol             | `clasico` (CLÁSICO) | `neon` (NEÓN)       | `retro` (RETRO, ámbar) |
| --------------- | ------------------- | ------------------- | ---------------------- |
| Fondo `bg`      | `#000000` (L=0,000) | `#000000` (L=0,000) | `#0a0700` (L=0,002)    |
| Nave            | `#ffffff` 21,00     | `#00f5ff` 15,50     | `#ffd27a` 14,14        |
| Llama           | `#ff8c1a` 9,02      | `#d96e00` 6,18      | `#ff8a00` 8,52         |
| Asteroide       | `#8c8c8c` 6,25      | `#ff006e` 5,48      | `#b87a00` 5,58         |
| Partícula       | `#8c8c8c` 6,25      | `#ff006e` 5,48      | `#8f5f00` 3,65         |
| Bala            | `#ffffff` 21,00     | `#f5ff00` 19,19     | `#fff4d6` 18,37        |
| Power-up 3x     | `#66ff66` 16,06     | `#00ff88` 15,66     | `#ffe9b0` 16,81        |
| Icono de vida   | `#ffffff` 21,00     | `#00f5ff` 15,50     | `#ffd27a` 14,14        |
| HUD label       | `#9a9a9a` 7,46      | `#e6e9ff` 17,46     | `#c98f2e` 7,14         |
| HUD valor       | `#ffffff` 21,00     | `#e6e9ff` 17,46     | `#ffc24d` 12,53        |
| HUD contador 3x | `#66ff66` 16,06     | `#00ff88` 15,66     | `#ffe9b0` 16,81        |
| Overlay título  | `#ffffff` 21,00     | `#e6e9ff` 17,46     | `#ffb000` 10,99        |
| Overlay sub     | `#b3b3b3` 10,02     | `#9697a6` 7,27      | `#c98f2e` 7,14         |
| GAME OVER       | `#ff4040` 6,06      | `#e6e9ff` 17,46     | `#ff7a1a` 7,72         |
| `glow`          | 0                   | 1                   | 0,35                   |
| Rejilla / borde | no aplica           | no aplica           | no aplica              |

Distinción por luminancia entre elementos que se tocan o se cruzan (ratio entre ambos colores):

| Par                  | `clasico` | `neon` | `retro` |
| -------------------- | --------- | ------ | ------- |
| Nave / asteroide     | 3,36      | 2,83   | 2,53    |
| Bala / asteroide     | 3,36      | 3,50   | 3,29    |
| Power-up / asteroide | 2,57      | 2,86   | 3,01    |
| Llama / nave         | 2,33      | 2,51   | 1,66    |

Notas por skin:

- **`clasico`**: vector arcade original. Nave, balas y vidas en blanco; asteroides en gris medio para que la nave destaque por luminancia; power-up en verde primario claro (único color además del blanco/gris en juego); GAME OVER en rojo primario. Sin glow.
- **`neon`**: es **exactamente la paleta actual** del motor (tokens `--cyan`, `--magenta`, `--yellow`, `--green`, `--ink`). Los dos valores que hoy usan alfa pasan a hex sólido equivalente sobre negro: llama `rgba(255,130,0,0.85)` → `#d96e00`; subtítulo `rgba(230,233,255,0.65)` → `#9697a6`. Implementada, NEÓN debe verse igual que hoy.
- **`retro`**: fósforo ámbar monocromo (5 tonos de ámbar + el fondo casi negro cálido). La jerarquía se da por luminancia: bala y power-up los más brillantes, nave clara, asteroide medio, partículas oscuras. Glow suave (0,35) que imita el bloom del fósforo.

## Cambios por archivo

- **`games/skins.ts`** (nuevo): `SkinId`, `SKIN_IDS`, `SKIN_LABELS`, `DEFAULT_SKIN`, `isSkinId`.
- **`games/types.ts`**: `setSkin?` en `GameHandle` y `skin?` en `GameCanvasProps`.
- **`games/registry.ts`**: `skins?: readonly SkinId[]` en `GameEntry`; `asteroides.skins = SKIN_IDS`.
- **`games/asteroides/engine.ts`**:
  - Borrar `CYAN`, `MAGENTA`, `MAGENTA_RGB`, `YELLOW`, `GREEN`, `INK`, `INK_RGB`, `FLAME` y el `#000` literal de `draw`.
  - Añadir `AsteroidesPalette`, `SKINS`, constantes `BLUR_*` con los valores base y el helper `rgba(hex, alpha)`.
  - Las clases `Bullet`, `Asteroid`, `PowerUp`, `Ship` y `Particle` reciben la paleta en `draw(ctx, palette, …)`; `glow(ctx, color, blur)` aplica `blur * palette.glow`.
  - `drawHUD` pinta `SCORE` y `NIVEL` con `hudLabel` y los números con `hudValue` (dos `fillText` con `measureText` para mantener la posición actual); vidas con `life`; contador 3x con `hudPowerUp`.
  - `drawOverlay(title, titleColor, sub)`: `overlayTitle` en el inicio, `gameOver` en GAME OVER, `overlaySub` en el subtítulo.
  - `createAsteroidesEngine(canvas, onChange, options?: { skin?: SkinId })`, variable `palette` en el closure y `setSkin(id)` en el objeto devuelto (redibuja si `paused`).
- **`games/asteroides/canvas.tsx`**: prop `skin`, motor creado con la skin inicial, `useEffect([skin])` → `setSkin`, `setSkin` en el handle (`AsteroidesHandle` incluye `"setSkin"`).
- **`lib/skin.ts`** (nuevo): store `av_skin` (`useSkin`, `setSkinPreference`).
- **`components/game-player.tsx`**: lee `useSkin()`, pasa `skin` al canvas y muestra el selector si `entry?.skins`.
- **`app/globals.css`**: estilos del selector (`.skin-picker` o similar), diseñados con `/frontend-design`.

## Plan de implementación

Cada paso deja el sistema funcionando y termina con su **Prueba manual**.

1. **Contrato.** Crear `games/skins.ts`, ampliar `games/types.ts` y `GameEntry`.
   - Prueba manual: `npx tsc --noEmit` y `npm run lint` pasan; los tres juegos funcionan igual.
2. **Paletas en el motor.** Añadir `AsteroidesPalette`, `SKINS` y los `BLUR_*`; sustituir todos los colores y blurs por la paleta activa; opción `{ skin }` y `setSkin`.
   - Prueba manual: con `skin: "neon"` forzado, ASTEROIDES se ve igual que antes de la spec (captura comparativa).
3. **Canvas.** Prop `skin`, `setSkin` en el handle, `useEffect([skin])`.
   - Prueba manual: `npx tsc --noEmit` pasa.
4. **Preferencia.** Crear `lib/skin.ts` con el patrón de `lib/session.ts`.
   - Prueba manual: `localStorage.setItem("av_skin","retro")` y recargar → retro; valor inválido → clásico.
5. **Selector en el reproductor.** Diseño con `/frontend-design`, `aria-pressed`, `blur()` tras el clic, solo si `entry.skins`.
   - Prueba manual: cambiar de skin en `ready`, `playing`, `dead`, en pausa y en GAME OVER; la partida no se reinicia ni cambia la puntuación.
6. **Validación visual.** Capturas de las tres skins en `.playwright-screenshots/` (`skins-asteroides-clasico.png`, `-neon.png`, `-retro.png`), en partida con asteroides, balas, power-up y HUD visibles, más una de GAME OVER por skin.

## Criterios de aceptación

- [x] `npm run build`, `npm run lint` y `npx tsc --noEmit` terminan sin errores.
- [x] `games/skins.ts` exporta `SkinId`, `SKIN_IDS`, `SKIN_LABELS` (`CLÁSICO`, `NEÓN`, `RETRO`), `DEFAULT_SKIN = "clasico"` e `isSkinId`.
- [x] `games/asteroides/engine.ts` exporta `SKINS` con las claves `clasico`, `neon` y `retro`, y cada una define todos los campos de `AsteroidesPalette` con los hex de la tabla.
- [x] En `games/asteroides/engine.ts` no queda ningún literal de color ni `shadowBlur` fuera de `SKINS`, los `BLUR_*` y el helper `glow`; el motor no usa `getComputedStyle`.
- [x] Sin `av_skin` en `localStorage`, `/juegos/asteroides/jugar` arranca en **CLÁSICO**: nave y balas blancas, asteroides grises, sin glow.
- [x] El selector SKIN aparece en `/juegos/asteroides/jugar` con CLÁSICO, NEÓN y RETRO, marca la activa (`aria-pressed="true"`) y **no** aparece en APILA, VÍBORA ni en los juegos simulados.
- [x] Al elegir una skin el canvas cambia de aspecto al instante, también en pausa, sin reiniciar la partida ni alterar puntuación, vidas, nivel, tiempos o colisiones.
- [x] Tras elegir una skin y pulsar Espacio, el juego recibe la tecla (dispara/arranca) y el botón no se reactiva.
- [x] La elección se guarda en `localStorage` (`av_skin`) y persiste al recargar y al salir y volver a entrar; un valor inválido cae a `clasico`.
- [x] No hay errores de hidratación en consola al cargar con una skin guardada distinta de `clasico`.
- [x] NEÓN se ve igual que ASTEROIDES antes de esta spec (colores y glow).
- [x] RETRO es monocromo ámbar con glow suave; los elementos se distinguen por brillo.
- [x] Todos los ratios de la tabla cumplen §5: texto (HUD, overlays, GAME OVER, "3x") ≥ 4,5:1 y nave, asteroides, balas, power-up, vidas y llama ≥ 3:1 contra el fondo de su skin.
- [x] Hay capturas de cada skin en `.playwright-screenshots/` (partida y GAME OVER).
- [x] APILA, VÍBORA y los juegos simulados se comportan exactamente igual que antes.

## Decisiones

- **Sí:** preferencia **global** (`av_skin`), no por juego. Las tres ids son comunes a todos los juegos y el jugador elige un "estilo de máquina". **No:** clave por juego (ver Preguntas abiertas).
- **Sí:** la skin llega como prop al canvas y el motor la cambia en caliente con `setSkin`. **No:** recrear el motor al cambiar de skin (perdería la partida).
- **Sí:** `setSkin?` y `skin?` opcionales en el contrato, para que APILA y VÍBORA compilen sin cambios hasta su propia spec.
- **Sí:** `GameEntry.skins` decide si se muestra el selector. **No:** detectar por `handle.setSkin` (el ref no existe en el primer render).
- **Sí:** factor `glow` por skin multiplicando los blurs actuales, en lugar de un blur por rol: menos campos y NEÓN conserva exactamente su glow.
- **Sí:** colores hex sólidos en la paleta y alfa calculada en el motor. Simplifica validar contraste y derivar transparencias.
- **Sí:** separar `hudLabel` y `hudValue` (hoy ambos `INK`). Permite el gris/blanco de CLÁSICO; en NEÓN ambos siguen en `#e6e9ff`.
- **Sí:** `gameOver` separado de `overlayTitle`. En NEÓN sigue en `--ink` para no cambiar el aspecto actual.
- **Sí:** RETRO en **ámbar**. Contrasta con el verde/cian dominante del vault y encaja con el vector-monitor de los 80. **No:** verde fósforo para ASTEROIDES (queda libre para otro juego si se quiere variedad; ver Preguntas abiertas).
- **No:** scanlines dibujadas por el motor en RETRO. `.crt-screen::after` ya aplica scanlines CSS a todas las skins; añadir otras duplicaría el efecto y oscurecería el texto.
- **No:** rejilla ni borde de tablero en ninguna skin: ASTEROIDES no los tiene y añadirlos sería un cambio de diseño, no de skin.
- **Sí:** fondo `#000000` en CLÁSICO y NEÓN (el actual); RETRO usa `#0a0700` (negro cálido, L=0,002 ≤ 0,05).

## Riesgos

| Riesgo                                                                     | Mitigación                                                                                      |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Desajuste de hidratación al leer `av_skin`                                 | `useSyncExternalStore` con `getServerSnapshot` = `DEFAULT_SKIN`, como `lib/session.ts`.         |
| El motor se crea con `clasico` y salta a la skin guardada un frame después | `setSkin` en `useEffect([skin])` redibuja al instante; el salto ocurre antes de pulsar Espacio. |
| Espacio reactiva el botón del selector en vez de llegar al juego           | `blur()` tras el clic; el motor ya hace `preventDefault` de Espacio.                            |
| En pausa el cambio de skin no se ve (el loop no redibuja)                  | `setSkin` redibuja si `paused`.                                                                 |
| El glow de NEÓN lava el HUD cuando un asteroide pasa por debajo            | Blur del HUD 4 (actual); el texto tiene ≥ 17:1 de contraste.                                    |
| En RETRO la llama (`#ff8a00`) apenas se distingue de la nave (1,66:1)      | Es un destello efímero detrás de la nave, sin colisión; aceptable y documentado.                |
| Olvidar algún color suelto al migrar el motor                              | Criterio de aceptación: ningún literal de color fuera de `SKINS`.                               |

## Preguntas abiertas

1. **Preferencia global o por juego.** La spec usa una sola clave `av_skin` para todos los juegos. ¿Prefieres recordar la skin por juego (`av_skin` como objeto `{ [gameId]: SkinId }`)?
2. **RETRO común o por juego.** Propongo ámbar para ASTEROIDES. ¿Quieres que RETRO sea el mismo fósforo en todos los juegos (coherencia de plataforma) o que cada juego tenga su variante (ámbar, verde, 8-bit)?
3. **Ubicación del selector.** Propuesto junto a `.hud-actions` en la barra del HUD. ¿Lo prefieres bajo el CRT (junto a `crt-bottom`) para no saturar la barra en móvil?
4. **GAME OVER en NEÓN.** Hoy es `--ink`; APILA y VÍBORA usan `--magenta` (`#ff006e`, 5,48:1). ¿Unificamos a magenta aunque cambie levemente el aspecto actual?
5. **Llama en RETRO.** ¿Se acepta 1,66:1 llama/nave o prefieres la llama más oscura (`#c96a00`: 5,31:1 contra el fondo y 2,66:1 contra la nave) para separarla más?
6. **Textos del HUD del canvas.** `SCORE` está en inglés (el resto del vault en español). No es asunto de skins; ¿abrimos otra spec para `PUNTOS`?
