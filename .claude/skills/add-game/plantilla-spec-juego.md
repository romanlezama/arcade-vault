# Plantilla de spec para un juego real

No se copia literalmente: todo lo que hay debajo de la línea es la forma que debe tener la spec. Los bloques marcados `[SI …]` solo se incluyen cuando aplican; quita la marca al escribir. Sustituye todos los marcadores `<…>`. El formato (cabecera en blockquote, secciones, Decisiones Sí/No, tabla de Riesgos) es el de `specs/04-juego-asteroides.md`.

Esta plantilla especializa `.claude/skills/spec/template.md` para juegos: la estructura general, el propósito de cada sección y las reglas de calidad (objetivo en una frase, "Fuera de alcance" obligatorio, criterios verificables) vienen de ese template. Léelo antes de usar esta plantilla.

---

# SPEC NN — Juego <TÍTULO>: <subtítulo corto>

> **Estado:** Borrador
> **Depende de:** SPEC 04, SPEC 05
> **Fecha:** <YYYY-MM-DD del contexto>
> **Objetivo:** <Una frase: portar `references/started-games/<carpeta>/` a TypeScript dentro del CRT en `/juegos/<id>/jugar`, notificando a React la puntuación, las vidas, el nivel y el estado, y guardando en el leaderboard real.>

## Por qué existe esta spec

<Qué es la referencia (archivos, líneas, dependencias), qué la impide vivir en Next.js tal cual (globales, DOM, listeners, setInterval…), qué ficha simulada sustituye o qué ficha añade. [SI registro] Es el segundo juego real: generaliza `GamePlayer` a un registro de motores, como dejó decidido SPEC 04.>

## Alcance

**Entra:**

- [SI ficha nueva] Nueva ficha en `GAMES` (`lib/games.ts`), en <N>.ª posición: `id: "<id>"`, título "<TÍTULO>", categoría <CAT>, color `<color>`. Portada nueva `cover-<id>` en `app/globals.css`.
- [SI ficha nueva] Stat de la Home: "<N-1>" pasa a "<N>" (`HOME_STATS` en `lib/home.ts`).
- [SI ficha sustituida] La ficha `<id>` (<TÍTULO>) pasa de partida simulada a juego real. Se conservan `id`, posición y portada <salvo …>.
- [SI migración] Migración `supabase/migrations/<timestamp>_scores_game_<id>.sql` que añade `'<id>'` a `scores_game_id_check`.
- [SI registro] Registro de motores `games/types.ts` + `games/registry.ts`. `GamePlayer` deja de usar `isAsteroides`. ASTEROIDES pasa por el registro sin cambios de comportamiento.
- Motor portado en `games/<id>/engine.ts`, sin React ni globales:
  - Misma jugabilidad que la referencia: <mecánicas concretas>.
  - Puntos: <reglas exactas de la referencia>.
  - HUD dibujado en el canvas: <qué muestra>.
  - [SI UI fuera del canvas] <Elemento DOM de la referencia> se dibuja dentro del canvas.
  - Estado inicial `ready`: "<TÍTULO>" y "PULSA ESPACIO PARA EMPEZAR".
  - GAME OVER dentro del canvas. Espacio reinicia a `playing`.
  - [SI victoria] Estado `won`: "<texto>" con la puntuación. Espacio reinicia.
  - Pausa en el motor: `P`, `Escape`, `pause()`/`resume()` y `visibilitychange`.
  - Paleta neón del vault.
  - `onChange(snapshot)` solo cuando cambia el snapshot.
  - `destroy()` cancela el rAF y retira todos los listeners.
- [SI assets] Assets en `public/games/<id>/` (<lista>).
- Componente cliente `games/<id>/canvas.tsx` con `pause`/`resume`/`reset` por `ref`.
- Integración en `components/game-player.tsx` [vía registro]: HUD con el snapshot, PAUSA/REANUDAR, FIN, GUARDAR PUNTUACIÓN en `public.scores` con `game_id = "<id>"`, JUGAR DE NUEVO con `reset()`.

**Fuera de alcance (para specs futuras):**

- <Mecánicas de la referencia que se dejan fuera según la Fase 3.>
- <Lista por defecto de checklist-integracion.md §9.>

## Modelo de datos

[SI ficha nueva o sustituida con cambios]

```ts
// lib/games.ts
{
  id: "<id>",
  title: "<TÍTULO>",
  short: "<…>",
  long: "<…>",
  cat: "<CAT>",
  cover: "cover-<id>",
  color: "<color>",
  best: <n>,
  plays: "<n>",
}
```

[SI migración]

```sql
-- supabase/migrations/<timestamp>_scores_game_<id>.sql
alter table public.scores drop constraint scores_game_id_check;
alter table public.scores add constraint scores_game_id_check check (game_id in (<lista completa>, '<id>'));
```

[SI registro]

```ts
// games/types.ts y games/registry.ts — ver checklist-integracion.md §4
```

```ts
// games/<id>/engine.ts
export type <X>Status = <…>;
export type <X>Snapshot = { status; paused; score; lives; level; <extras> };
export type <X>Engine = { pause(); resume(); reset(); destroy() };
export function create<X>Engine(canvas, onChange): <X>Engine;
```

```ts
// games/<id>/canvas.tsx
export type <X>Handle = Pick<<X>Engine, "pause" | "resume" | "reset">;
export function <X>Canvas(props: { ref?; onChange }): React.JSX.Element;
```

Convenciones:

- Lógica en <W>×<H>, escalada por CSS dentro de `.crt-screen`. [Cómo encaja si no es 4:3.]
- Constantes de la referencia con los mismos valores: <lista de las relevantes>.
- Paleta: <rol → token>.
- Input: teclas <…> con `preventDefault`. Se ignoran eventos de `input`/`textarea`/`contentEditable`. [SI ratón] Ratón en el canvas con coordenadas escaladas por `getBoundingClientRect`.
- `lives` y `level` del snapshot: <qué representan si el juego no los tiene tal cual>.
- `onChange` se llama al crear con (`ready`, 0, <vidas>, 1, `paused: false`).
- Con `paused: true` el loop dibuja el último frame sin `update`; al reanudar `dt` no acumula.

## Plan de implementación

Cada paso deja el sistema funcionando y termina con su **Prueba manual**.

1. [SI registro] **Registro de motores.** … Prueba manual: ASTEROIDES igual que antes; `/juegos/caida/jugar` simulado.
2. **Ficha y portada.** [o "Ficha" si es sustituida] … Prueba manual: `/biblioteca`, `/juegos/<id>`.
3. [SI migración] **Migración del CHECK.** `npx supabase migration new …`, `npm run db:push`, `npm run db:types`. Prueba manual: `migration list --remote`; insert con `'<id>'` funciona y con `'pong'` sigue fallando.
4. [SI assets] **Assets.** Copiar a `public/games/<id>/`. Prueba manual: `/games/<id>/<archivo>` responde 200 en `npm run dev`.
5. **Port del motor (jugabilidad).** Prueba manual: `npx tsc --noEmit` y `npm run lint`.
6. **Ciclo de vida, estados e input.** Prueba manual: `npx tsc --noEmit`.
7. **Componente canvas.** Prueba manual: `npx tsc --noEmit` y `npm run lint`.
8. **Integración en el reproductor.** Entrada en el registro [o rama en `GamePlayer`]. Prueba manual: ready → jugar → FIN → modal con la puntuación → GUARDAR crea fila en `public.scores`.
9. **Paleta neón.** Prueba manual: colores por rol.

## Criterios de aceptación

- [ ] `npm run build`, `npm run lint` y `npx tsc --noEmit` terminan sin errores.
- [ ] `/juegos/<id>` y `/juegos/<id>/jugar` se prerenderizan como las demás rutas de `/juegos/[id]`, y `/salon` sigue siendo estática.
- [SI ficha nueva] [ ] `/biblioteca` muestra <N> tarjetas; <TÍTULO> es la última y aparece con el filtro <CAT>.
- [SI ficha nueva] [ ] La portada `cover-<id>` se ve en la tarjeta y en el Detalle, y no es idéntica a ninguna otra.
- [SI ficha nueva] [ ] El primer stat de la Home dice "<N>" y el rail sigue mostrando los mismos 6 juegos.
- [SI migración] [ ] `npx supabase migration list --remote` muestra la migración aplicada en Local y Remote, y un insert con un `game_id` fuera de la lista sigue fallando.
- [ ] Al abrir `/juegos/<id>/jugar`, el canvas muestra "<TÍTULO>" y "PULSA ESPACIO PARA EMPEZAR", nada se mueve y la puntuación del HUD es 0.
- [ ] Tras pulsar Espacio, <controles concretos> funcionan como en la referencia.
- [ ] Pulsar las teclas del juego no hace scroll de la página.
- [ ] <Reglas de puntuación concretas>, y la puntuación del HUD de la plataforma coincide con la del canvas.
- [ ] Perder una vida actualiza vidas en el canvas y en el HUD. [o el equivalente]
- [ ] Subir de nivel actualiza el nivel en el canvas y en el HUD. [o el equivalente]
- [ ] Al perder, el canvas muestra "GAME OVER" con la puntuación y el modal no se abre solo. Espacio inicia una partida nueva con los valores iniciales.
- [SI victoria] [ ] Al <condición>, el canvas muestra "<texto>" con la puntuación. Espacio reinicia.
- [ ] `P`, `Escape` y el botón PAUSA pausan y muestran "EN PAUSA". Repetirlos (o REANUDAR) reanuda sin saltos.
- [ ] Cambiar de pestaña durante la partida la deja en pausa al volver.
- [ ] FIN pausa el motor y abre "FIN DEL JUEGO" con la puntuación actual, o la final si ya hubo GAME OVER.
- [ ] En el modal se pueden escribir iniciales con espacios sin que el juego reaccione ni la página haga scroll.
- [ ] GUARDAR PUNTUACIÓN crea exactamente una fila en `public.scores` con `game_id = '<id>'`, el nombre del input y la puntuación mostrada.
- [ ] Tras guardar, `/salon` muestra la puntuación en la pestaña <TÍTULO> y en la fila <TÍTULO> de "TODOS LOS JUEGOS".
- [ ] JUGAR DE NUEVO cierra el modal y deja el canvas en "PULSA ESPACIO PARA EMPEZAR" con los valores iniciales.
- [ ] Al salir con SALIR y volver a entrar solo hay un loop activo: velocidad normal y consola sin errores.
- [SI assets] [ ] Los assets cargan sin 404 en la pestaña Network.
- [SI ratón] [ ] El control con ratón sigue al cursor con precisión a cualquier tamaño de ventana.
- [ ] Los colores siguen la paleta de las convenciones.
- [ ] ASTEROIDES y el resto de juegos se comportan exactamente igual que antes.

## Decisiones

- **Sí:** <cada respuesta de la Fase 3 con su porqué>.
- **No:** <alternativa descartada con su porqué>.
- **Sí:** portar a TypeScript con `create<X>Engine(canvas, onChange)` en `games/<id>/`. Mismo patrón que ASTEROIDES (SPEC 04).
- **No:** iframe o `<Script>` con el `game.js` original. Globales y listeners imposibles de limpiar; la puntuación exigiría `postMessage`.
- **Sí:** el juego completo queda dentro del canvas (HUD y GAME OVER propios) y el HUD de la plataforma refleja el snapshot.
- **Sí:** el modal solo se abre con FIN (heredado de SPEC 04).
- **Sí:** la puntuación se guarda en `public.scores` con el flujo de SPEC 05; el motor no conoce Supabase.
- [SI registro] **Sí:** registro de motores ahora que hay dos juegos reales. **No:** encadenar `game.id === …` en `GamePlayer`.
- [SI migración] **Sí:** migración nueva para el CHECK. **No:** quitar el CHECK.
- [SI ficha sustituida] **Sí:** reutilizar la ficha `<id>`. Mantiene rutas, pestaña del Salón y CHECK sin migración.

## Riesgos

| Riesgo                                                                         | Mitigación                                                                                   |
| ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| Strict Mode monta dos veces y deja dos loops                                   | Motor en `useEffect` con `destroy()` en el cleanup. Criterio de un solo loop.                |
| Los listeners capturan teclas mientras se escriben iniciales                   | Se ignoran `input`/`textarea`/`contentEditable`; el motor está pausado con el modal abierto. |
| El motor toca `window` al importarse y rompe el prerender                      | Solo se accede dentro de `create<X>Engine`, llamado en `useEffect`.                          |
| `onChange` en cada frame provoca 60 renders/s                                  | Comparar con el último snapshot emitido.                                                     |
| [SI registro] Generalizar `GamePlayer` rompe ASTEROIDES                        | Paso propio con prueba manual de ASTEROIDES antes de portar el juego nuevo.                  |
| [SI migración] Olvidar el CHECK hace fallar el guardado                        | Migración antes de la integración; el fallo es visible ("ERROR AL GUARDAR").                 |
| [SI assets] Rutas de assets rotas (404)                                        | Rutas absolutas `/games/<id>/…`; criterio en Network.                                        |
| [SI ratón] Coordenadas del ratón desplazadas por el escalado CSS               | Conversión con `getBoundingClientRect` y la escala del canvas.                               |
| [SI setInterval en la referencia] El ritmo depende del intervalo y no se pausa | Acumuladores de tiempo dentro del rAF.                                                       |
| Canvas escalado borroso en pantallas grandes                                   | Aceptable por estilo retro; `devicePixelRatio` en otra spec.                                 |

## Lo que **no** entra en esta spec

- <Resumen de "Fuera de alcance".>

Cada uno de estos puntos, si llega, va en su propia spec.
