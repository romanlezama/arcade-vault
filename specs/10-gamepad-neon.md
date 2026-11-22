# SPEC 10 — Gamepad neón: aspecto del mando táctil según la referencia MK-II

> **Estado:** Implementado
> **Depende de:** SPEC 09
> **Fecha:** 2026-11-22
> **Objetivo:** Que el mando táctil de ASTEROIDES, APILA y VÍBORA tenga el aspecto del "Gamepad MK-II" de `references/gamepad-assets/`: cruceta de 4 teclas en relieve con núcleo luminoso y botones redondos B (cian) y A (magenta) con letra, dentro de un panel neón.

## Por qué existe esta spec

La SPEC 09 hizo jugables los juegos reales en móvil con un mando propio: teclas cian con esquina recortada y botones redondos con etiqueta (PROPULSAR, DISPARAR…). El usuario aportó un diseño de gamepad (`references/gamepad-assets/gamepad.html` y `gamepad-neon.png`) y quiere que el mando se vea igual.

Esta spec **cambia el aspecto y la disposición** del mando, no su mecánica. Se conservan los eventos de teclado sintéticos (`lib/virtual-keys.ts`), los modos `hold`/`tap`/`repeat`, el multitoque, la liberación de teclas, el toque en el CRT y la visibilidad con `(pointer: coarse)`.

Sustituye estas partes de la SPEC 09:

- La disposición por juego (fila `◀ ▶` en ASTEROIDES, fila `◀ ▼ ▶` en APILA) pasa a ser una cruceta de 4 direcciones en los tres juegos.
- Las etiquetas de texto (PROPULSAR, DISPARAR, GIRAR, CAÍDA) pasan a ser las letras A y B.
- Los colores amarillo/magenta de los botones de acción pasan a ser B cian y A magenta.
- El criterio "botones de al menos 56×56 px" se sustituye por las medidas de la referencia.

## Alcance

**Entra:**

- **Panel MK-II** (`.gp`): degradado oscuro, borde `--line`, borde interior cian tenue, textura de puntos y sombra cian inferior, como la referencia.
- **Cruceta** de 4 teclas en cruz con núcleo central y una gema cian que late. Flechas en SVG (no dependen de la fuente).
- **Botones A y B** redondos con brillo radial, letra en fuente pixel y anillo discontinuo al pulsar. B cian a la izquierda, A magenta a la derecha.
- **Estado pulsado** de la referencia (`.on` / `:active`): la tecla se hunde e ilumina en cian; A/B se hunden y muestran el anillo. Se aplica con `data-pressed`.
- **Teclas sin función** ("apagadas"): se pintan, se ven atenuadas, llevan `disabled` y no envían nada.
- **Mapeo por juego:**

  | Juego      | ◀ ▶                                        | ▲                             | ▼                             | A                                   | B                             |
  | ---------- | ------------------------------------------ | ----------------------------- | ----------------------------- | ----------------------------------- | ----------------------------- |
  | ASTEROIDES | girar, `hold` (`ArrowLeft`/`ArrowRight`)   | propulsar, `hold` (`ArrowUp`) | apagada                       | disparar, `tap` (`Space`)           | propulsar, `hold` (`ArrowUp`) |
  | APILA      | mover, `repeat` (`ArrowLeft`/`ArrowRight`) | girar, `tap` (`ArrowUp`)      | bajar, `repeat` (`ArrowDown`) | caída, `tap` (`Space`)              | girar, `tap` (`ArrowUp`)      |
  | VÍBORA     | girar, `tap` (flechas)                     | girar, `tap` (`ArrowUp`)      | girar, `tap` (`ArrowDown`)    | arrancar/reiniciar, `tap` (`Space`) | apagado                       |

  En VÍBORA, Espacio solo arranca o reinicia; en partida el motor lo ignora.

- **Solo letras** en A y B. No hay leyenda en pantalla.
- **Teclas compartidas:** en ASTEROIDES, ▲ y B mantienen la misma tecla (`ArrowUp`). `lib/virtual-keys.ts` cuenta las pulsaciones mantenidas por `code` y solo envía `keyup` cuando se suelta la última. Así, soltar ▲ mientras B sigue apoyado no corta la propulsión.
- **Medidas de la referencia:**
  - Ancho de ventana ≤ 620 px: teclas de cruceta de 46 px (cruceta de 144 px) y A/B de 64 px.
  - Ancho > 620 px: teclas de 50 px (cruceta de 156 px) y A/B de 74 px.
- **Vertical:** un solo panel bajo el CRT, con la cruceta a la izquierda y B/A a la derecha, lado a lado.
- **Horizontal táctil:** dos medios paneles con el mismo marco. La cruceta va a la izquierda del CRT y B/A a la derecha, **apilados** (B encima de A).
- **Animación** de la gema central desactivada con `prefers-reduced-motion: reduce`.
- Se eliminan los estilos del mando de la SPEC 09 (`.touch-pad*`, `.touch-btn*`).

**Fuera de alcance (para specs futuras):**

- Cambios en la mecánica del mando (modos, tiempos de repetición, toque en el CRT, visibilidad).
- Leyenda de qué hace A/B en cada juego.
- Encender los botones del mando al pulsar el teclado físico (la referencia lo hace; aquí el mando solo se ve en táctil).
- Teclas WASD, Z/J/X/K o cualquier otra tecla que no entiendan ya los motores.
- Estilos `:hover` de la referencia (no aplican en táctil).
- Skins del mando o mando distinto por juego.
- Importar o servir archivos de `references/` (el CSS se porta a `app/globals.css`).
- Cambios en los motores.

## Modelo de datos

### Contrato del mando (`games/types.ts`)

Sustituye `TouchButton` y `TouchLayout` de la SPEC 09:

```ts
export type TouchButtonMode = "hold" | "tap" | "repeat"; // sin cambios

export type TouchButton = {
  code: string; // KeyboardEvent.code a emitir
  ariaLabel: string; // "Girar a la izquierda", "Disparar"…
  mode: TouchButtonMode;
};

export type TouchLayout = {
  dpad: {
    up?: TouchButton;
    down?: TouchButton;
    left?: TouchButton;
    right?: TouchButton;
  };
  a?: TouchButton;
  b?: TouchButton;
};
```

- Un botón que falta se pinta **apagado**: `disabled`, `aria-label="Sin uso"` y sin eventos.
- Desaparecen `label` y `arrangement`: las flechas son SVG fijos y las letras A/B salen de la posición.

### Diseños (`games/touch-layouts.ts`)

`ASTEROIDES_TOUCH`, `APILA_TOUCH` y `VIBORA_TOUCH` reescritos con la tabla de mapeo de la sección Alcance. `ASTEROIDES_TOUCH.dpad.down` y `VIBORA_TOUCH.b` no existen.

### Teclas mantenidas (`lib/virtual-keys.ts`)

- Un contador por `code` (`Map<string, number>`).
- `pressKey(code)` sin `repeat` incrementa el contador y solo despacha `keydown` cuando pasa de 0 a 1.
- `pressKey(code, true)` (repeticiones) despacha siempre y no cuenta.
- `releaseKey(code)` decrementa y solo despacha `keyup` cuando llega a 0.
- `tapKey(code)` no usa el contador: despacha `keydown` y `keyup` seguidos.

## Cambios por archivo

- **`games/types.ts`**: nuevo `TouchButton` (sin `label`) y nuevo `TouchLayout` (`dpad`, `a`, `b`).
- **`games/touch-layouts.ts`**: los tres diseños con el mapeo nuevo.
- **`lib/virtual-keys.ts`**: contador de teclas mantenidas.
- **`components/touch-controls.tsx`**: nuevo marcado de la referencia.
  - `.gp` > `.gp-body` > zona cruceta (`.gp-dpad` con `.dp-up/down/left/right`, `.dp-hub` y `.dp-hub-gem`) y zona de acciones (`.gp-actions` con `.ab.b` y `.ab.a`, cada uno con `.ab-ring` y `.ab-letter`).
  - Cada botón activo conserva la lógica de la SPEC 09 (modos, captura del dedo, liberación).
  - Las flechas son los mismos `path` SVG de la referencia.
  - Un único componente `<TouchControls layout />`: desaparece la prop `slot`.
- **`components/game-player.tsx`**: un solo `<TouchControls layout={entry.touch} />` después del CRT, en lugar de los dos grupos a los lados.
- **`app/globals.css`**:
  - se portan los estilos de `.gp`, `.dp*` y `.ab*` de la referencia, con sus dos tamaños (≤ 620 px y > 620 px);
  - el estado pulsado usa `[data-pressed]` en lugar de `.on`/`:active`;
  - teclas apagadas con `:disabled`;
  - en horizontal táctil, `.gp` pasa a `display: contents` y cada zona se pinta como medio panel a un lado del CRT, con A/B en columna;
  - se borran `.touch-pad*` y `.touch-btn*`.
- **`specs/09-controles-tactiles.md`**: nota bajo la cabecera indicando que el aspecto, la disposición, las etiquetas y el criterio de 56 px los sustituye la SPEC 10.
- **`CLAUDE.md`**: fila de la SPEC 10 en la tabla de specs.

## Plan de implementación

Cada paso deja el sistema funcionando y termina con su **Prueba manual**.

1. **Teclas mantenidas con contador.** Cambiar `lib/virtual-keys.ts`.
   - Prueba manual: con el mando actual de la SPEC 09, todo sigue funcionando igual (girar, propulsar, disparar, repetición en APILA).
2. **Contrato y diseños nuevos.** `games/types.ts`, `games/touch-layouts.ts` y adaptar `components/touch-controls.tsx` y `GamePlayer` al nuevo `TouchLayout` (marcado provisional, sin estilos nuevos).
   - Prueba manual: `npx tsc --noEmit` y `npm run lint` pasan; en emulación móvil cada botón envía la tecla de la tabla de mapeo y los apagados no envían nada.
3. **Panel MK-II en vertical.** Marcado definitivo de la referencia y estilos portados en `app/globals.css`, con los dos tamaños. Borrar `.touch-pad*` y `.touch-btn*`.
   - Prueba manual: captura en vertical de ASTEROIDES comparada con `references/gamepad-assets/gamepad-neon.png`.
4. **Medios paneles en horizontal.** `display: contents`, medio panel a cada lado del CRT y A/B apilados.
   - Prueba manual: en emulación de iPhone (844×390) y Pixel (915×412) todo cabe sin scroll.
5. **Documentación.** Nota en `specs/09-controles-tactiles.md` y fila en `CLAUDE.md`.
   - Prueba manual: la tabla de `CLAUDE.md` mantiene su alineación.
6. **Validación visual.** Capturas en `.playwright-screenshots/` de los tres juegos en vertical y horizontal (`gamepad-<juego>-<vertical|horizontal>.png`), con un botón de cruceta y uno de A/B pulsados. Prueba manual del usuario en un móvil real.

## Criterios de aceptación

- [x] `npm run build`, `npm run lint` y `npx tsc --noEmit` terminan sin errores.
- [x] Los motores (`games/*/engine.ts`) no tienen cambios.
- [x] En táctil, los tres juegos muestran un panel con cruceta de 4 teclas, núcleo con gema cian y botones redondos B (cian, izquierda) y A (magenta, derecha) con su letra, como `gamepad-neon.png`.
- [x] Las flechas de la cruceta son SVG y A/B no muestran ninguna etiqueta de texto además de su letra.
- [x] Cada botón envía exactamente la tecla y el modo de la tabla de mapeo.
- [x] ▼ en ASTEROIDES y B en VÍBORA se ven atenuados, tienen `disabled` y no envían ninguna tecla.
- [x] En ASTEROIDES, con ▲ y B apoyados a la vez, levantar uno de los dos no detiene la propulsión; levantar el segundo sí la detiene.
- [x] En VÍBORA, A arranca la partida en `ready` y la reinicia en `gameover` o `won`.
- [x] Al pulsar una tecla de la cruceta se hunde y se ilumina en cian; al pulsar A o B se hunde y aparece su anillo discontinuo.
- [x] Con ancho ≤ 620 px, las teclas de la cruceta miden 46×46 px y A/B 64×64 px; con ancho > 620 px, 50×50 px y 74×74 px.
- [x] En vertical hay un solo panel bajo el CRT, con la cruceta a la izquierda y B/A lado a lado a la derecha, sin scroll horizontal.
  - Nota: el panel no desborda. En vertical la página mide 395 px en un viewport de 390 por el botón ☰ de la cabecera (`components/nav.tsx`), que ya desbordaba antes de las SPEC 09 y 10. Queda para un arreglo aparte de la cabecera.
- [x] En horizontal táctil hay un medio panel a cada lado del CRT, con B encima de A, y todo cabe sin scroll en 844×390 y 915×412.
- [x] Con `prefers-reduced-motion: reduce`, la gema central no se anima.
- [x] En escritorio el mando no se ve, y los juegos simulados no lo muestran.
- [x] El multitoque, la liberación de teclas y el toque en el CRT de la SPEC 09 siguen funcionando.
- [x] `app/globals.css` ya no contiene `.touch-pad` ni `.touch-btn`.
- [x] `specs/09-controles-tactiles.md` tiene la nota de sustitución y `CLAUDE.md` la fila de la SPEC 10.
- [x] Hay capturas de los tres juegos en vertical y en horizontal en `.playwright-screenshots/`.
- [x] El usuario ha jugado al menos una partida en un móvil real con cada juego.

## Decisiones

- **Sí:** cruceta completa de 4 teclas en los tres juegos, como la referencia, aprovechando ▲ (propulsar en ASTEROIDES, girar en APILA). **No:** mantener la fila por juego ni ocultar las teclas sin uso (dejaría huecos en la cruz).
- **Sí:** teclas sin función atenuadas y `disabled`. Se ve la forma completa de la referencia y queda claro que esa tecla no hace nada.
- **Sí:** solo letras A/B, sin leyenda. Es lo que muestra la referencia; A es siempre la acción principal (Espacio) y B la secundaria. **No:** etiqueta bajo el botón ni leyenda en el panel.
- **Sí:** B propulsa en ASTEROIDES. Permite girar con el pulgar izquierdo y propulsar y disparar con el derecho. **No:** B apagado en ASTEROIDES.
- **Sí:** en VÍBORA, A envía Espacio (arranca o reinicia, igual que tocar el CRT). **No:** A y B apagados.
- **Sí:** contador de teclas mantenidas en `lib/virtual-keys.ts`. Sin él, soltar ▲ con B apoyado enviaría `keyup` de `ArrowUp` y cortaría la propulsión.
- **Sí:** medidas de la referencia (46/64 px y 50/74 px) aunque estén por debajo de los 56 px de la SPEC 09. Es una decisión del usuario para que el mando sea igual a la referencia. Las teclas de 46 px siguen por encima del mínimo de 44 px de WCAG 2.5.5.
- **Sí:** el corte de tamaño en 620 px de ancho, el mismo de la referencia. En vertical se usan las medidas pequeñas y en horizontal las grandes.
- **Sí:** en horizontal, dos medios paneles y A/B apilados. Con A/B lado a lado y medidas grandes el conjunto ocupa unos 860 px y no cabe en los 844 px de un iPhone. **No:** medidas pequeñas en horizontal ni encoger el CRT.
- **Sí:** un solo componente `<TouchControls layout />` y `display: contents` en horizontal. El panel es un elemento en vertical y se parte en dos zonas de la rejilla en horizontal sin duplicar marcado.
- **Sí:** CSS portado a `app/globals.css` y fuentes de `next/font` ya cargadas. **No:** importar `references/` ni cargar Google Fonts aparte.
- **No:** encender el mando con el teclado físico. El mando solo se ve en táctil.

## Riesgos

| Riesgo                                                                                  | Mitigación                                                                                                                                                     |
| --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Teclas de 46 px más fáciles de fallar con el pulgar                                     | Decisión explícita del usuario; se valida en el móvil real. Si molesta, otra spec sube el tamaño.                                                              |
| Que el contador de teclas se desincronice (por ejemplo, un `releaseKey` sin `pressKey`) | El contador nunca baja de 0, y la liberación de la SPEC 09 (levantar, cancelar, ocultar la pestaña, desmontar) llama a `releaseKey` una vez por botón pulsado. |
| `display: contents` hace que el panel pierda su caja en horizontal                      | Cada zona dibuja su propio marco de medio panel en horizontal; se verifica con capturas.                                                                       |
| La gema animada distrae o gasta batería                                                 | Animación suave de 2 s, como la referencia; desactivada con `prefers-reduced-motion`.                                                                          |
| Los nombres `.gp`, `.dp` y `.ab` chocan con clases existentes                           | Al implementar, buscar esos nombres en `app/globals.css` y en `components/`; si existen, usar prefijo `.gp-`.                                                  |

## Lo que **no** entra en esta spec

- Cambios en la mecánica del mando o en los motores.
- Leyenda de A/B.
- Encender el mando con el teclado físico.
- Teclas nuevas (WASD, Z/X…).
- Estilos `:hover`.
- Skins del mando.
- Importar archivos de `references/`.

Cada uno de estos puntos, si llega, va en su propia spec.
