# SPEC 09 — Controles táctiles para los juegos reales

> **Estado:** Implementado
> **Depende de:** SPEC 04, SPEC 06, SPEC 07
> **Fecha:** 2026-11-22
> **Objetivo:** Que ASTEROIDES, APILA y VÍBORA se puedan jugar en un móvil táctil, en vertical y en horizontal, con un mando virtual por juego bajo o junto al CRT que emite los mismos eventos de teclado que ya entienden los motores.

> **Nota (SPEC 10):** el aspecto y la disposición del mando de esta spec los sustituye la [SPEC 10](10-gamepad-neon.md) (panel "Gamepad MK-II"). Ya no aplican: la disposición en fila por juego, las etiquetas de texto (PROPULSAR, DISPARAR, GIRAR, CAÍDA), los colores amarillo/magenta de los botones de acción ni el criterio de botones de al menos 56×56 px. La mecánica (teclas virtuales, modos, multitoque, liberación de teclas, toque en el CRT y visibilidad) sigue vigente.

## Por qué existe esta spec

Los tres motores reales solo escuchan `keydown`/`keyup` en `window` y leen `e.code`. En un móvil no hay teclado: la partida no se puede ni empezar, porque arrancar exige pulsar Espacio. El canvas sí se escala bien (800×600 con `width: 100%` dentro de `.crt-screen`, 4:3).

La solución no toca los motores. Un mando virtual emite eventos de teclado sintéticos con el mismo `code` que la tecla real. Así los motores, sus specs (04, 06, 07) y el control por teclado siguen exactamente igual.

**Numeración:** esta spec es la 09 porque, al escribirla, la 08 (`specs/08-skins-asteroides.md`) estaba en el PR #13 sin fusionar. El #13 se fusionó antes de implementar esta spec, y la rama `spec-09-controles-tactiles` sale de ese `main`.

## Alcance

**Entra:**

- **Mando virtual por juego** (`components/touch-controls.tsx`): botones de dirección a la izquierda y de acción a la derecha, con el diseño que declara cada juego en el registro:
  - **ASTEROIDES:** `◀` `▶` (mantener, `ArrowLeft`/`ArrowRight`); `PROPULSAR` (mantener, `ArrowUp`); `DISPARAR` (toque, `Space`).
  - **APILA:** `◀` `▼` `▶` (mantener con repetición, `ArrowLeft`/`ArrowDown`/`ArrowRight`); `GIRAR` (toque, `ArrowUp`); `CAÍDA` (toque, `Space`).
  - **VÍBORA:** cruceta `▲` `◀` `▶` `▼` (toque, flechas). Sin botones de acción.
- **Eventos sintéticos** (`lib/virtual-keys.ts`): `KeyboardEvent` despachados en `window` con el `code` y el `key` de la tecla real.
- **Tres modos de botón:**
  - `hold`: `keydown` al apoyar el dedo y `keyup` al levantarlo.
  - `tap`: `keydown` y `keyup` seguidos al apoyar el dedo.
  - `repeat`: `keydown` al apoyar; tras 170 ms, `keydown` con `repeat: true` cada 50 ms; `keyup` al levantar.
- **Multitoque:** cada botón sigue su propio `pointerId` con `setPointerCapture`, de modo que se puede girar, propulsar y disparar a la vez en ASTEROIDES.
- **Arranque y reinicio tocando el CRT:** en dispositivos táctiles, tocar `.crt-screen` envía Espacio (toque) **solo** si el snapshot está en `ready`, `gameover` o `won`. En partida, tocar el CRT no hace nada. Los textos del canvas ("PULSA ESPACIO…") no cambian.
- **Visibilidad solo en táctil:** el mando se renderiza siempre para los juegos que lo declaran, pero solo se muestra con `@media (pointer: coarse)`. En escritorio no se ve.
- **Maquetación móvil del reproductor:**
  - **Vertical:** HUD arriba, CRT a todo el ancho y el mando debajo (direcciones a la izquierda, acciones a la derecha).
  - **Horizontal** (`(pointer: coarse) and (orientation: landscape)`), solo en `/juegos/[id]/jugar`:
    - se ocultan la cabecera (`.av-nav`) y el pie (`.av-footer`);
    - la barra HUD se compacta en una sola línea;
    - el CRT ocupa el alto restante (`100dvh` menos el HUD) manteniendo 4:3;
    - las direcciones van a la izquierda del CRT y las acciones a la derecha.
    - Se sale con el botón SALIR del HUD.
- **Higiene táctil:** `touch-action: none`, `user-select: none` y `-webkit-touch-callout: none` en el mando; `touch-action: manipulation` en `.crt-screen` para evitar el zoom por doble toque.
- **Liberar teclas mantenidas** al levantar el dedo, al cancelarse el puntero (`pointercancel`, `lostpointercapture`), al ocultarse la pestaña y al desmontar el componente, para que ninguna tecla quede "pegada".
- Diseño visual del mando con `/frontend-design`, coherente con `.btn` y la paleta del vault.

**Fuera de alcance (para specs futuras):**

- Gestos (deslizar, tocar en el canvas para disparar o girar).
- Cambiar los motores, sus textos ("TOCA PARA EMPEZAR") o añadir una API `press/release` al contrato `GameHandle`.
- Controles táctiles para los juegos simulados (no reciben entrada).
- Vibración (`navigator.vibrate`) y pantalla completa (Fullscreen API).
- Gamepad físico (Gamepad API) y remapeo de teclas.
- Interruptor manual para mostrar u ocultar el mando.
- Maquetación móvil del resto de páginas (Home, Biblioteca, Detalle, Salón).
- `devicePixelRatio` en los canvas.

## Modelo de datos

### Contrato del mando (`games/types.ts`)

```ts
export type TouchButtonMode = "hold" | "tap" | "repeat";

export type TouchButton = {
  code: string; // KeyboardEvent.code a emitir: "ArrowLeft", "Space"…
  label: string; // texto visible: "◀", "DISPARAR"…
  ariaLabel: string; // "Girar a la izquierda", "Disparar"…
  mode: TouchButtonMode;
};

export type TouchLayout = {
  arrangement: "row" | "cross"; // cómo se colocan las direcciones
  directions: readonly TouchButton[];
  actions: readonly TouchButton[]; // puede estar vacío (VÍBORA)
};
```

- En `arrangement: "cross"` las direcciones se colocan por su `code`: `ArrowUp` arriba, `ArrowLeft` izquierda, `ArrowRight` derecha y `ArrowDown` abajo.
- En `arrangement: "row"` se colocan en una fila, en el orden del array.

### Registro (`games/registry.ts`)

`GameEntry` añade `touch?: TouchLayout`. Los tres juegos reales lo declaran. Si no existe, `GamePlayer` no pinta mando ni activa el toque en el CRT.

### Diseños (`games/touch-layouts.ts`, nuevo)

`ASTEROIDES_TOUCH`, `APILA_TOUCH` y `VIBORA_TOUCH` con los botones de la sección Alcance.

### Teclas virtuales (`lib/virtual-keys.ts`, nuevo, sin React)

- `pressKey(code, repeat = false)`: despacha `keydown` en `window`.
- `releaseKey(code)`: despacha `keyup` en `window`.
- `tapKey(code)`: `pressKey` + `releaseKey`.

Los eventos llevan `code`, el `key` equivalente (`"ArrowLeft"`, `" "`…), `bubbles: true` y `cancelable: true`. Su `target` es `window`, así que el filtro `isTextTarget` de los motores los deja pasar.

### Constantes de repetición (`components/touch-controls.tsx`)

`REPEAT_DELAY_MS = 170` y `REPEAT_INTERVAL_MS = 50`.

## Cambios por archivo

- **`games/types.ts`**: `TouchButtonMode`, `TouchButton` y `TouchLayout`.
- **`games/touch-layouts.ts`** (nuevo): los tres diseños.
- **`games/registry.ts`**: `touch?: TouchLayout` en `GameEntry`; `touch` en `asteroides`, `apila` y `vibora`.
- **`lib/virtual-keys.ts`** (nuevo): `pressKey`, `releaseKey`, `tapKey`.
- **`components/touch-controls.tsx`** (nuevo, `"use client"`): pinta un `TouchLayout`, gestiona los modos, el multitoque y la liberación de teclas. Recibe `layout` y `slot: "directions" | "actions"` para poder colocar cada grupo a un lado del CRT en horizontal.
- **`components/game-player.tsx`**:
  - pinta el mando si `entry?.touch`;
  - envuelve el CRT para la maquetación vertical/horizontal;
  - `onPointerDown` en `.crt-screen` → `tapKey("Space")` si `pointerType !== "mouse"` y el snapshot está en `ready`, `gameover` o `won`.
- **`components/footer.tsx`**: añade `className="av-footer"` para poder ocultarlo.
- **`app/globals.css`**: estilos del mando (`.touch-pad`, `.touch-btn`…), visibilidad con `(pointer: coarse)` y maquetación horizontal con `body:has(.av-player)`.

## Plan de implementación

Cada paso deja el sistema funcionando y termina con su **Prueba manual**.

1. **Teclas virtuales.** Crear `lib/virtual-keys.ts`.
   - Prueba manual: en la consola de `/juegos/vibora/jugar`, llamar a la función equivalente con `Space` arranca la partida y con `ArrowUp` gira la serpiente.
2. **Contrato y diseños.** Tipos en `games/types.ts`, `games/touch-layouts.ts` y `touch` en el registro.
   - Prueba manual: `npx tsc --noEmit` y `npm run lint` pasan; los tres juegos funcionan igual con teclado.
3. **Componente del mando.** `components/touch-controls.tsx` con los modos `hold`, `tap` y `repeat`, multitoque y liberación de teclas. Estilos base en `app/globals.css`, diseñados con `/frontend-design`.
   - Prueba manual: con la emulación móvil de Playwright, el mando de ASTEROIDES gira, propulsa y dispara.
4. **Integración en el reproductor (vertical).** Pintar el mando bajo el CRT en `GamePlayer`, solo visible con `(pointer: coarse)`. Toque en el CRT para arrancar y reiniciar.
   - Prueba manual: en vertical se juega una partida completa de cada juego solo con toques; en escritorio el mando no aparece.
5. **Maquetación horizontal.** `className="av-footer"` en el pie; ocultar cabecera y pie, HUD compacto y mandos a los lados del CRT con `(pointer: coarse) and (orientation: landscape)`.
   - Prueba manual: en horizontal el CRT y los dos grupos de botones caben en pantalla sin scroll.
6. **Validación visual.** Capturas en `.playwright-screenshots/` con emulación de iPhone y Pixel, en vertical y en horizontal, de los tres juegos (`tactil-<juego>-<vertical|horizontal>.png`). Prueba manual del usuario en un móvil real.

## Criterios de aceptación

- [x] `npm run build`, `npm run lint` y `npx tsc --noEmit` terminan sin errores.
- [x] `games/asteroides/engine.ts`, `games/apila/engine.ts` y `games/vibora/engine.ts` no tienen cambios.
- [x] En escritorio (puntero fino) no se ve el mando en ningún juego y el teclado funciona igual que antes.
- [x] En un dispositivo táctil, `/juegos/asteroides/jugar`, `/juegos/apila/jugar` y `/juegos/vibora/jugar` muestran su mando con los botones y etiquetas de la sección Alcance.
- [x] Los juegos simulados no muestran mando y tocar su CRT no hace nada.
- [x] Tocar el CRT en `ready` arranca la partida, y en `gameover` (o `won` en VÍBORA) la reinicia.
- [x] Tocar el CRT durante la partida no dispara, no gira y no hace caída en APILA.
- [x] ASTEROIDES: mantener `◀`/`▶` gira mientras el dedo está apoyado; mantener `PROPULSAR` propulsa; cada toque de `DISPARAR` dispara una vez.
- [x] ASTEROIDES: se puede girar, propulsar y disparar a la vez con varios dedos.
- [x] APILA: un toque en `◀`/`▶` mueve una columna; mantenerlo repite el movimiento; `▼` baja; `GIRAR` rota; `CAÍDA` deja caer la pieza.
- [x] VÍBORA: cada flecha de la cruceta gira la serpiente en esa dirección.
- [x] Al levantar el dedo, deslizarlo fuera del botón, cancelarse el toque u ocultar la pestaña, ninguna tecla queda pulsada (la nave deja de girar y de propulsar).
- [x] Mantener pulsado un botón no abre el menú contextual ni selecciona texto, y el doble toque en el CRT no hace zoom.
- [x] En vertical, el CRT ocupa el ancho de la pantalla y el mando queda debajo, sin scroll horizontal.
- [x] En horizontal táctil, en `/juegos/[id]/jugar` se ocultan la cabecera y el pie, el HUD ocupa una línea y el CRT y los dos grupos de botones caben sin scroll.
- [x] PAUSA/REANUDAR, FIN, SALIR y el modal FIN DEL JUEGO siguen funcionando con toques.
- [x] Los botones del mando miden al menos 56×56 px CSS.
- [x] Hay capturas de los tres juegos en vertical y en horizontal en `.playwright-screenshots/`.
- [x] El usuario ha jugado al menos una partida en un móvil real con cada juego.

## Decisiones

- **Sí:** mando virtual en pantalla. Sirve para mantener varias acciones a la vez, que ASTEROIDES necesita. **No:** gestos sobre el canvas; quedan para otra spec.
- **Sí:** eventos de teclado sintéticos con el mismo `code`. Los motores y sus specs no cambian y el teclado sigue funcionando. **No:** API `press/release` en `GameHandle`; tocaría los tres motores.
- **Sí:** emular la repetición en el modo `repeat` (170 ms de espera y 50 ms de intervalo, del orden de la repetición de teclado de un sistema típico). APILA depende de la repetición nativa, que un evento sintético no trae.
- **Sí:** `DISPARAR` en modo `tap`. ASTEROIDES dispara una vez por pulsación de Espacio, como con el teclado. **No:** fuego automático al mantener, que cambiaría la jugabilidad.
- **Sí:** diseño de mando por juego declarado en el registro, con etiquetas que dicen qué hace cada botón. **No:** cruceta común con botones A/B genéricos.
- **Sí:** visibilidad con `@media (pointer: coarse)` en CSS y render siempre. No hay detección en JavaScript, así que no hay desajuste de hidratación. **No:** interruptor manual (otra spec si hace falta).
- **Sí:** arrancar y reiniciar tocando el CRT, solo en `ready`, `gameover` y `won`, leyendo el snapshot que ya tiene `GamePlayer`. **No:** cambiar los textos de los motores.
- **Sí:** el toque en el CRT ignora `pointerType === "mouse"`. En escritorio el clic no arranca la partida y todo sigue como hoy.
- **Sí:** en horizontal táctil se ocultan cabecera y pie, solo en el reproductor, con `body:has(.av-player)`. Es la única forma de que el CRT 4:3 quepa en unos 390 px de alto. **No:** scroll automático ni encoger el CRT.
- **Sí:** botones de al menos 56×56 px. Supera el mínimo de 44 px de WCAG 2.5.5 y deja margen para jugar sin mirar.
- **No:** vibración ni pantalla completa. Soporte desigual en iOS y no son necesarios para jugar.

## Riesgos

| Riesgo                                                                                                                                      | Mitigación                                                                                                                                                 |
| ------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Una tecla queda "pegada" (la nave gira sin parar) si se pierde el `pointerup`                                                               | Liberar en `pointerup`, `pointercancel`, `lostpointercapture`, `visibilitychange` y al desmontar. Criterio de aceptación específico.                       |
| La emulación de Playwright no activa `(pointer: coarse)` o no permite mantener varios toques                                                | Contexto con `hasTouch: true` e `isMobile: true`; si aun así no se puede, se verifica con CDP (`Input.dispatchTouchEvent`) y en el móvil real del usuario. |
| iOS Safari hace zoom por doble toque o abre la lupa al mantener                                                                             | `touch-action`, `user-select: none` y `-webkit-touch-callout: none` en mando y CRT.                                                                        |
| `100dvh` no descuenta las barras del navegador en algunos móviles                                                                           | Usar `dvh` (dinámico) y comprobar en el móvil real; si falla, `svh` como respaldo.                                                                         |
| Conflicto con el PR #13 (SPEC 08), que también toca `games/types.ts`, `games/registry.ts`, `components/game-player.tsx` y `app/globals.css` | Fusionar el #13 antes de implementar esta spec y crear la rama desde `main` actualizado.                                                                   |
| El selector de skins de SPEC 08 satura la barra HUD compacta en horizontal                                                                  | Al implementar, comprobar la barra con el selector; si no cabe, se oculta el selector en horizontal y se anota en esta spec.                               |
| `KeyboardEvent` sintéticos con `isTrusted: false` ignorados por algún motor                                                                 | Ningún motor comprueba `isTrusted` hoy; criterio de aceptación de que los motores no cambian.                                                              |

## Lo que **no** entra en esta spec

- Gestos (deslizar, tocar el canvas para jugar).
- Cambios en los motores o en sus textos.
- API `press/release` en `GameHandle`.
- Mando para los juegos simulados.
- Vibración y pantalla completa.
- Gamepad físico y remapeo de teclas.
- Interruptor manual del mando.
- Maquetación móvil del resto de páginas.
- `devicePixelRatio`.

Cada uno de estos puntos, si llega, va en su propia spec.
