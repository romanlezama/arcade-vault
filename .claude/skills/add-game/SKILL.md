---
name: add-game
description: Porta un juego de references/started-games/ (o un diseño original) a Arcade Vault generando una spec en specs/ con motor TypeScript, canvas, ficha en GAMES, portada y leaderboard en Supabase, siguiendo el patrón de SPEC 04 y SPEC 05. No escribe código; la implementación se hace después con /spec-impl.
disable-model-invocation: true
argument-hint: <carpeta de referencia, p. ej. 03-tetris>
allowed-tools: Read, Glob, Grep, Write, AskUserQuestion, Bash(ls:*), Bash(cat:*), Bash(date:*), Bash(wc:*), Bash(grep:*), Bash(find:*)
---

# /add-game — Spec para añadir un juego real al vault

## Contexto de la sesión

Fecha de hoy (úsala en la cabecera de la spec, nunca la inventes):
!`date +%F`

Specs existentes:
!`ls specs/ 2>/dev/null || echo "No existe la carpeta specs/"`

Juegos de referencia disponibles:
!`ls references/started-games/ 2>/dev/null | grep -v __MACOSX || echo "No existe references/started-games/"`

Juegos reales ya portados (`games/`):
!`ls games/ 2>/dev/null || echo "No existe games/"`

Ids actuales de `GAMES` (`lib/games.ts`):
!`grep -n 'id: "' lib/games.ts 2>/dev/null || echo "No se encontró lib/games.ts"`

Migraciones que definen el CHECK de `game_id` (la última manda):
!`grep -l "scores_game_id_check" supabase/migrations/*.sql 2>/dev/null || echo "Ninguna"`

¿`GamePlayer` usa ya un registro de motores o sigue con `isAsteroides`?
!`grep -n "isAsteroides\|GAME_REGISTRY" components/game-player.tsx 2>/dev/null || echo "Sin coincidencias"`

---

## Qué hace este skill

Convierte un juego de `references/started-games/<carpeta>/` en una **spec** lista para revisar, con el mismo formato y nivel de detalle que `specs/04-juego-asteroides.md`, que además deja el juego conectado al leaderboard real de `specs/05-leaderboard-real.md`.

**No escribes código.** Tu único entregable es el archivo `specs/NN-juego-<id>.md`. Cuando lo guardes, te detienes.

**Método base: el skill `/spec`.** Este skill es una especialización de `/spec` para juegos. Antes de escribir la spec **debes leer** (con Read, no invocándolo) los dos archivos del skill `/spec`:

- `.claude/skills/spec/SKILL.md` — el método spec-driven: fases, cómo preguntar, cuándo dejar de preguntar, cómo escribir y guardar la spec y sus reglas duras.
- `.claude/skills/spec/template.md` — la estructura de referencia de toda spec (cabecera, alcance, modelo de datos, plan, criterios, decisiones, riesgos) y qué se espera de cada sección.

Si algo choca, manda este orden: (1) las reglas de este skill y sus archivos de apoyo para lo específico de juegos, (2) `.claude/skills/spec/SKILL.md` y `template.md` para el método y la forma general, (3) el formato de las specs existentes del repo (en español, estados `Borrador`/`Aprobado`…).

Archivos de apoyo (en este mismo directorio). Léelos todos antes de la Fase 4:

- `contrato-motor.md` — contrato obligatorio de `games/<id>/engine.ts` y `games/<id>/canvas.tsx`.
- `checklist-integracion.md` — cada punto de la plataforma que toca un juego nuevo y cuándo aplica.
- `plantilla-spec-juego.md` — esqueleto de la spec con criterios de aceptación y riesgos reutilizables.

Responde siempre en español. La spec también va en español.

---

## Fase 1 — Identificar la referencia

El argumento recibido es: `$ARGUMENTS`

- Si está vacío: muestra las carpetas de referencia disponibles (las tienes arriba), pregunta cuál portar y **para** hasta recibir respuesta.
- Si tiene valor: busca la carpeta en `references/started-games/`. Acepta el nombre completo (`03-tetris`), solo el número (`03`) o solo el slug (`tetris`).
- Si no hay carpeta que coincida: enséñale las disponibles y pregunta si quiere corregir el nombre o tratarlo como **juego original sin referencia** (diseño propio del usuario). En ese caso, en la Fase 3 tendrás que preguntar también las mecánicas, la puntuación, los controles y las condiciones de fin. Nunca recrees un juego comercial concreto (nombre, personajes, arte, niveles): solo el género y las mecánicas.
- Si el juego ya existe en `games/<id>/`, avisa y para: esto es para juegos nuevos, no para modificar uno portado.

## Fase 2 — Analizar la referencia y la plataforma

### 2.1 Proyecto

1. Lee `CLAUDE.md` y `AGENTS.md`.
2. Lee `.claude/skills/spec/SKILL.md` y `.claude/skills/spec/template.md` completos. Aplica su Fase 2 (preguntas) en la Fase 3 de este skill y su Fase 3/4 (escritura y guardado) en la Fase 4.
3. Lee `specs/04-juego-asteroides.md` y `specs/05-leaderboard-real.md` completos: son el patrón de formato, tono y decisiones.
4. Lee `games/asteroides/engine.ts` (al menos la API pública, el snapshot, el input y `destroy`) y `games/asteroides/canvas.tsx`.
5. Lee `components/game-player.tsx` y `lib/games.ts`.
6. Lee la última migración que define `scores_game_id_check` (listada arriba).

### 2.2 Referencia

Lee **todo** el código de la carpeta (no solo el README): `README.md`, `CLAUDE.md`, `index.html`, `game.js`, módulos extra (`levels.js`, `style.css`…), `assets/` (lista de archivos) y `specs/` si existen. Ignora `.DS_Store`, `__MACOSX`, `.github/`, `.Claude/`, `.agents/` y `skills-lock.json`.

Construye un **inventario** (para ti; lo usarás en la spec):

| Aspecto              | Qué buscar                                                                                                                                                           |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lienzo               | Tamaño del canvas. ¿Encaja en 4:3 (`.crt-screen`)? Si no, cómo se encaja (escala, bandas, redimensionar la lógica).                                                  |
| UI fuera del canvas  | Elementos DOM con información del juego (siguiente pieza, marcador, overlays HTML, botones). Todo eso debe pasar a dibujarse en el canvas o al HUD de la plataforma. |
| Globales y DOM       | Variables globales, `document.getElementById`, `querySelector`, estilos CSS propios.                                                                                 |
| Listeners y loops    | `addEventListener` sin limpiar, `requestAnimationFrame`, `setInterval`/`setTimeout`.                                                                                 |
| Estados              | Inicio, jugando, pausa, vida perdida, game over, victoria, transición de nivel.                                                                                      |
| Métricas             | Puntuación (reglas exactas), vidas, nivel y extras (líneas, combos…). Qué equivale a `lives` y `level` si el juego no los tiene.                                     |
| Input                | Teclas usadas (para `preventDefault`), ratón (coordenadas a escalar con `getBoundingClientRect`), táctil.                                                            |
| Constantes           | Velocidades, tamaños, tiempos, probabilidades: se conservan con los mismos valores.                                                                                  |
| Assets               | Imágenes, spritesheets, sonidos, fuentes. Irán a `public/games/<id>/`.                                                                                               |
| Mecánicas especiales | Power-ups, selector de nivel, trucos de depuración, sonidos, niveles en archivos aparte.                                                                             |

### 2.3 Estado de la plataforma

- **Registro de motores.** Si `GamePlayer` sigue con `isAsteroides` (ver contexto arriba), este es el segundo juego real y la spec **debe incluir** generalizar a un registro (`checklist-integracion.md`). SPEC 04 lo dejó decidido.
- **CHECK de `game_id`.** Comprueba si el id que va a usar el juego ya está en la lista. Si no, la spec incluye una migración nueva.
- **Ficha simulada equivalente.** Mira si alguna ficha de `GAMES` ya representa este género (p. ej. Tetris ≈ CAÍDA, Arkanoid ≈ BLOQUE BUSTER, Snake ≈ SERPENTINA).

## Fase 3 — Preguntas

Pregunta en bloques de 3 a 5 con `AskUserQuestion`, con tu recomendación primero y marcada "(Recomendado)". Espera respuesta antes del siguiente bloque. No preguntes lo que ya está decidido en SPEC 04/05 salvo que este juego lo haga raro.

**Siempre:**

1. **Ficha.** ¿Sustituye a una ficha simulada equivalente (mantiene su `id`, no necesita migración, no cambia el stat de la Home ni las pestañas del Salón) o es una ficha nueva (id nuevo al final de `GAMES`, migración del CHECK, stat de la Home +1, pestaña nueva en el Salón)? Si hay ficha equivalente, recomienda sustituir y explica que las puntuaciones existentes de ese id en `public.scores` (si las hay) quedarán en el ranking del juego real.
2. **Mecánicas.** Qué se conserva y qué queda fuera (sonido, selector de nivel, trucos, menús propios). Por defecto se conserva todo lo jugable y se quitan los atajos de depuración.
3. **Victoria final** (si el juego puede terminarse): estado `won` en el canvas con la puntuación y Espacio para reiniciar, igual que GAME OVER (recomendado), u otra opción.
4. **Aspecto.** Paleta neón con los tokens del vault (recomendado, como ASTEROIDES) o sprites originales si la referencia trae spritesheet.

**Según el juego:**

- Ficha nueva: `id` (kebab-case), título en mayúsculas, categoría (`ARCADE` | `PUZZLE` | `SHOOTER` | `VERSUS`) y color (`cyan` | `magenta` | `yellow` | `green`). Los textos `short`/`long` los redacta la spec y el usuario los ajusta al revisar.
- Lienzo que no es 4:3, o UI fuera del canvas: cómo se encaja.
- Juego sin vidas o sin niveles: qué se muestra en el HUD de la plataforma (`—`, 1 vida fija, nivel = velocidad…).
- Ratón como control principal.
- Si se quiere cambiar algún default de SPEC 04 (modal solo con FIN, estado `ready`, pausa en el motor, HUD doble).

**Cuándo parar:** cuando puedas responder sin suponer nada:

1. Qué archivos aparecen o cambian.
2. Cuál es el primer paso ejecutable y cuál el último.
3. Cómo se verifica que está terminado.

## Fase 4 — Escribir la spec

1. **Antes de crear el archivo**, relee `.claude/skills/spec/SKILL.md` (sus Fases 3 y 4 y sus reglas duras) y `.claude/skills/spec/template.md` (propósito y ejemplo de cada sección). Después relee `contrato-motor.md`, `checklist-integracion.md` y `plantilla-spec-juego.md`. Comprueba que la spec que vas a escribir cumple el template de `/spec` sección por sección: objetivo en una sola frase, "Fuera de alcance" explícito, plan con pasos que dejan el sistema funcionando, criterios booleanos verificables y decisiones con su porqué.
2. Escribe la spec completa siguiendo la plantilla de juegos dentro de la estructura del template de `/spec`. Si la Fase 3 quedó completa, escríbela entera de una vez; si falta información, ve sección por sección como indica `/spec`. Rellena todos los marcadores (`<ID>`, `<TÍTULO>`, `<X>`…) y elimina los bloques condicionales que no apliquen (registro, migración, assets, ratón, victoria…).
3. Todo lo concreto sale del inventario de la Fase 2: constantes reales, reglas de puntuación reales, teclas reales. No inventes mecánicas que no estén en la referencia ni en las respuestas.
4. Recoge en **Decisiones** cada respuesta de la Fase 3 (Sí/No con su porqué) y las decisiones heredadas de SPEC 04/05 que apliquen.
5. Guarda el archivo:
   - Número: el mayor de `specs/` + 1, con dos dígitos.
   - Nombre: `specs/NN-juego-<id>.md`.
   - `**Estado:** Borrador` (nunca Aprobado).
   - `**Depende de:**` SPEC 04 y SPEC 05 como mínimo. Comprueba que existen en `specs/`.
   - `**Fecha:**` la del contexto de arriba.
   - No pidas permiso para escribirlo. Solo pregunta si el archivo ya existe.
   - Si no existe `specs/.spec-config.yml`, créalo con el contenido por defecto que indica `.claude/skills/spec/SKILL.md` (Fase 4, paso 7). Si existe, no lo toques.
6. Confirma al usuario:
   - Ruta del archivo.
   - Resumen en 3–5 viñetas (ficha nueva o sustituida, ¿registro?, ¿migración?, ¿assets?).
   - Recordatorio: está en Borrador; cámbialo a Aprobado tras revisarlo.
   - Siguiente paso: `/spec-impl NN-juego-<id>`.
   - **Para aquí.**

## Reglas duras

- No escribas código ni modifiques ningún archivo que no sea la spec nueva (y `specs/.spec-config.yml` solo si no existía).
- No escribas la spec sin haber leído antes `.claude/skills/spec/SKILL.md` y `.claude/skills/spec/template.md` en esta sesión.
- No propongas implementar la spec después de guardarla.
- No marques la spec como Aprobada.
- No supongas decisiones que el usuario no confirmó: pregunta en la Fase 3.
- La spec no puede contradecir `contrato-motor.md` sin recogerlo como decisión explícita.
- Si el juego es demasiado grande para una spec (p. ej. multijugador en red, editor de niveles), propón dividirlo antes de escribir.
