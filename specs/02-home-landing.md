# SPEC 02 — Home: landing page de Arcade Vault

> **Estado:** Aprobado
> **Depende de:** SPEC 01
> **Fecha:** 2026-11-08
> **Objetivo:** Convertir `/` en la landing page de `references/templates/home-about/` y mover la Biblioteca a `/biblioteca`, actualizando el nav y los enlaces existentes.

## Por qué existe esta spec

En SPEC 01 la Biblioteca vive en `/`. La nueva plantilla `references/templates/home-about/` añade una pantalla de inicio (landing) que funciona como puerta de entrada y lleva a la Biblioteca. Por eso la Biblioteca necesita su propia ruta. Los enlaces que hoy apuntan a `/` pensando en la Biblioteca también tienen que revisarse. Las primeras 930 líneas de `styles.css` de la plantilla son idénticas a las de SPEC 01, así que solo hay que portar los bloques CSS nuevos.

## Alcance

**Entra:**

- Nueva ruta `/biblioteca` con el contenido actual de `/`: el hero "ARCADE VAULT" y `<Library />`.
- `/` pasa a ser la Home, con estas secciones en el orden de `home.jsx`:
  - **Hero:** siluetas flotantes en SVG (`s1`–`s8`), eyebrow "▸ INSERTA UNA MONEDA_", título en tres líneas, subtítulo, CTAs "▶ EXPLORAR JUEGOS" (→ `/biblioteca`) y "✦ CREAR CUENTA" (→ `/login`), e indicador "DESLIZA ▼".
  - **// 01 ¿POR QUÉ ARCADE VAULT?:** cuatro `feature-card` con iconos pixel (GAMEPAD, FREE, TROPHY, ROCKET).
  - **// 02 JUEGOS DISPONIBLES AHORA:** `mini-rail` con los primeros 6 juegos de `GAMES`. Cada uno enlaza a `/juegos/<id>`. Debajo va el botón "VER TODOS LOS JUEGOS →" (→ `/biblioteca`).
  - **Stats:** tres bloques (`stat-block`).
  - **// 03 ACTIVIDAD EN VIVO:** ticker "▸ ÚLTIMAS PUNTUACIONES" (7 filas) y "▸ TOP JUGADORES · HOY" (5 filas con barra), con el enlace "VER SALÓN →" (→ `/salon`).
  - **// 04 PRECIOS:** tarjeta "JUGADOR VAULT" ($0 / SIEMPRE) con el botón "EMPEZAR GRATIS →" (→ `/login`), el sello "FREE PLAY" y tres FAQ.
  - **CTA final:** "¿LISTO PARA JUGAR?" con el botón "INSERTAR MONEDA →" (→ `/biblioteca`).
- Animación de aparición al hacer scroll (`.reveal` → `.reveal.in`) con IntersectionObserver, con fallback accesible.
- Nav: los links pasan a ser "Inicio" (`/`), "Biblioteca" (`/biblioteca`) y "Salón de la Fama" (`/salon`), en la barra y en el panel móvil. El logo lleva a `/`.
- Reapuntar enlaces existentes:
  - A `/biblioteca`: "VOLVER AL VAULT" del Detalle, "VOLVER AL VAULT" del modal del reproductor y el botón de `hall-of-fame.tsx`.
  - Se quedan en `/`: el logo, el enlace de la 404 y la redirección de `auth-form.tsx` tras login o "JUGAR COMO INVITADO".
- Portar a `app/globals.css` los bloques `HOME PAGE`, `ACTIVITY` y `PRICING` de `references/templates/home-about/styles.css`.
- Ajustes de texto respecto a la plantilla:
  - Stat "12+" → "8", con "JUEGOS" y "Y CONTANDO".
  - Descripción de "JUEGOS CLÁSICOS": "Bloque Buster, Caída, Serpentina y muchos más. Los mejores arcades de todos los tiempos en un solo lugar."
  - Todo lo demás se copia literal.

**Fuera de alcance (para specs futuras):**

- Página "Acerca de" y formulario de contacto (`about.jsx`), además del link "Acerca de" en el nav.
- Gamepad virtual y variantes de tema (bloques `GAMEPAD` y `Theme variants` del CSS).
- Bloque CSS `ABOUT PAGE`.
- Datos reales en "Actividad en vivo" o en las stats: ni `av_scores` ni `seededScores`.
- Abrir `/login` directamente en la pestaña "CREAR CUENTA" (`?modo=registro`).
- Ocultar los CTAs de registro cuando hay sesión iniciada.
- Tests automatizados.

## Modelo de datos

```ts
// lib/home.ts — constantes estáticas de la Home (sin "use client")
export type NeonColor = "cyan" | "magenta" | "yellow" | "green";
export type FeatureIconKind = "GAMEPAD" | "FREE" | "TROPHY" | "ROCKET";

export type Feature = { icon: FeatureIconKind; title: string; desc: string; color: NeonColor };
export type HomeStat = { n: string; u: string; s: string };                 // { n: "8", u: "JUEGOS", s: "Y CONTANDO" }
export type RecentScore = { player: string; game: string; score: number; ago: string; color: NeonColor };
export type TopPlayer = { rank: number; player: string; score: number };
export type FaqItem = { q: string; a: string };

export const FEATURES: Feature[];            // 4, en el orden de home.jsx
export const HOME_STATS: HomeStat[];         // 3: "8"/JUEGOS, "MILES"/DE PARTIDAS, "GLOBAL"/RANKING
export const RECENT_SCORES: RecentScore[];   // las 7 filas del ticker de home.jsx
export const TOP_PLAYERS: TopPlayer[];       // las 5 filas de home.jsx
export const FAQ: FaqItem[];                 // las 3 preguntas de precios
```

Además se reutilizan `GAMES` de `lib/games.ts` (SPEC 01) para el rail con `GAMES.slice(0, 6)`.

Convenciones:

- Las puntuaciones se formatean con `toLocaleString("es-ES")`, igual que en SPEC 01.
- La barra del top usa `width: (100 - i * 16) + "%"`, igual que la plantilla.
- Los retardos escalonados también son los de la plantilla:
  - `feature-card`: `i * 80` ms.
  - `stat-block`: `i * 90` ms.
  - `tick-row`: `i * 60` ms.

## Plan de implementación

1. **Mover la Biblioteca.**
   - Crear `app/biblioteca/page.tsx` con el contenido actual de `app/page.tsx` (hero y `<Library />`).
   - Dejar `app/page.tsx` temporalmente con el mismo contenido para que `/` siga funcionando.
   - Prueba manual: `/biblioteca` muestra la Biblioteca completa y `npm run build` pasa.
2. **Nav y enlaces.**
   - En `components/nav.tsx`, cambiar `sectionOf`:
     - `"inicio"` en `/`.
     - `"biblioteca"` en `/biblioteca` y `/juegos/*`.
     - `"salon"` y `"auth"` quedan como hoy.
   - Añadir "Inicio" y apuntar "Biblioteca" a `/biblioteca`, en la barra y en el panel móvil.
   - Cambiar a `/biblioteca` los enlaces de `app/juegos/[id]/page.tsx` ("VOLVER AL VAULT"), de `components/game-player.tsx` ("VOLVER AL VAULT" del modal) y de `components/hall-of-fame.tsx`.
   - Prueba manual: el link activo es correcto en `/`, `/biblioteca`, `/juegos/caida` y `/salon`.
3. **CSS.**
   - Añadir al final de `app/globals.css` los bloques `HOME PAGE`, `ACTIVITY` y `PRICING` de la plantilla, sin cambios.
   - Añadir una regla `@media (prefers-reduced-motion: reduce)` que deje `.reveal` visible, sin transform ni transición.
   - Prueba manual: `npm run build` pasa y las pantallas existentes no cambian.
4. **Datos de la Home.** Crear `lib/home.ts` con el modelo de arriba. Prueba manual: `npx tsc --noEmit` pasa.
5. **Componentes de presentación.** Todos son Server Components:
   - `components/floating-silhouettes.tsx`: las 8 siluetas SVG con `aria-hidden`.
   - `components/feature-icon.tsx`: los 4 iconos pixel.
   - `components/mini-card.tsx`: un `<Link>` a `/juegos/<id>` con la clase `mini-card`.
   - Prueba manual: `npx tsc --noEmit` y `npm run lint` pasan.
6. **Home: hero, features y rail.**
   - Reemplazar `app/page.tsx` (Server Component) por `<div className="home fade-in">` con el hero, "// 01" y "// 02".
   - Los botones son `<Link className="btn …">`.
   - Prueba manual: en `/` se ven las siluetas animadas, las 4 features y 6 mini-cards, y "EXPLORAR JUEGOS" navega a `/biblioteca`.
7. **Home: stats, actividad, precios y CTA final.**
   - Añadir las secciones restantes a `app/page.tsx`, alimentadas por `lib/home.ts`.
   - Prueba manual: "VER SALÓN →" navega a `/salon`, "EMPEZAR GRATIS →" a `/login` e "INSERTAR MONEDA →" a `/biblioteca`.
8. **Animación reveal.**
   - Crear `components/reveal-observer.tsx` (`"use client"`, renderiza `null`). En un `useEffect` observa todos los `.reveal` y les añade `in` al entrar en pantalla (threshold 0.12). Al desmontar hace `disconnect()`.
   - Si `IntersectionObserver` no existe, añade `in` a todos los `.reveal` de inmediato.
   - Montarlo en `app/page.tsx` y añadir `reveal` a las secciones, como en la plantilla.
   - Prueba manual: al hacer scroll, cada sección aparece con fade/slide. Con "reduce motion" activado en el sistema, todo es visible sin animación.

## Criterios de aceptación

- [ ] `npm run build` termina sin errores y `/` y `/biblioteca` se prerenderizan como estáticas.
- [ ] `npm run lint` termina sin errores.
- [ ] La consola del navegador no muestra errores de hidratación en `/` ni en `/biblioteca`.
- [ ] `/` coincide visualmente con la Home de `references/templates/home-about/arcade-vault-standalone.html` a 1440px y 390px de ancho. Solo difieren los textos ajustados en el Alcance.
- [ ] `/biblioteca` muestra el hero "ARCADE VAULT", la búsqueda, los chips y las 8 tarjetas. Es idéntica a la antigua `/`.
- [ ] El nav muestra "Inicio", "Biblioteca" y "Salón de la Fama", en ese orden, en la barra y en el panel móvil. No aparece "Acerca de".
- [ ] El link activo es "Inicio" en `/`; "Biblioteca" en `/biblioteca`, `/juegos/caida` y `/juegos/caida/jugar`; y "Salón de la Fama" en `/salon`.
- [ ] El logo navega a `/`.
- [ ] "▶ EXPLORAR JUEGOS", "VER TODOS LOS JUEGOS →" e "INSERTAR MONEDA →" navegan a `/biblioteca`.
- [ ] "✦ CREAR CUENTA" y "EMPEZAR GRATIS →" navegan a `/login`.
- [ ] "VER SALÓN →" navega a `/salon`.
- [ ] El rail muestra exactamente BLOQUE BUSTER, CAÍDA, SERPENTINA, GLOTÓN, INVASORES y ROCAS. Clic en CAÍDA navega a `/juegos/caida`.
- [ ] El ticker muestra 7 filas y el top muestra 5. "#01 NEONFOX 312.840" tiene el estilo `top1`.
- [ ] El primer stat dice "8" / "JUEGOS" / "Y CONTANDO".
- [ ] La feature "JUEGOS CLÁSICOS" menciona Bloque Buster, Caída y Serpentina. No menciona Arkanoid, Tetris ni Snake.
- [ ] "VOLVER AL VAULT" en `/juegos/caida` y en el modal "FIN DEL JUEGO" navega a `/biblioteca`.
- [ ] El botón del Salón de la Fama que antes iba a `/` navega a `/biblioteca`.
- [ ] El enlace de la 404 y la redirección tras login o "JUGAR COMO INVITADO" siguen yendo a `/`.
- [ ] Las secciones `.reveal` están ocultas al cargar y aparecen al hacer scroll hasta ellas.
- [ ] Con `prefers-reduced-motion: reduce` emulado, todas las secciones son visibles sin hacer scroll ni esperar transición.
- [ ] Las siluetas del hero tienen `aria-hidden="true"`.

## Decisiones

- **Sí:** Home en `/` y Biblioteca en `/biblioteca`. Es fiel a la plantilla, donde la landing es la puerta de entrada.
- **No:** Home en `/inicio` dejando la Biblioteca en `/`. La landing no sería lo primero que ve el visitante.
- **Sí:** enlaces mixtos. "VOLVER AL VAULT" y el botón del Salón llevan a `/biblioteca` porque hablan de juegos. El logo, la 404 y la redirección de auth van a `/`.
- **No:** "Acerca de" en esta spec, ni su link en el nav. Va en su propia spec. Un link a una página inexistente mostraría la 404.
- **Sí:** datos de actividad, top y stats como constantes en `lib/home.ts`. Es estático, se prerenderiza y no causa errores de hidratación.
- **No:** derivarlos de `seededScores` o de `av_scores`. Cambiaría los números de la plantilla. Leer localStorage convertiría la sección en cliente. Si se conectan datos reales, irá en otra spec.
- **Sí:** ajustar "12+" a "8" y cambiar Arkanoid/Tetris/Snake por juegos propios del vault. La Home no debe prometer juegos que no existen ni citar marcas de terceros.
- **Sí:** "CREAR CUENTA" lleva a `/login` sin parámetros. Es la misma razón que en SPEC 01: los search params con Cache Components exigen límites de `<Suspense>` adicionales.
- **Sí:** la página es Server Component, con un único `RevealObserver` cliente que no renderiza nada. Mantiene casi toda la Home en el servidor.
- **Sí:** fallback accesible para `.reveal`. Con `prefers-reduced-motion` se muestra todo sin animar, y sin `IntersectionObserver` todo queda visible.
- **No:** reveal literal sin fallback. Podría dejar secciones invisibles.
- **Sí:** botones de la Home como `<Link className="btn …">` en lugar de `<button onClick={navigate}>`. Son enlaces reales con prefetch y funcionan sin JS.
- **Sí:** portar solo los bloques CSS `HOME PAGE`, `ACTIVITY` y `PRICING`. El resto de `styles.css` ya está en `globals.css` o pertenece a specs futuras (About, Gamepad).
- **Sí:** componentes planos en `components/`, siguiendo la convención de SPEC 01.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Si el JS falla o tarda, las secciones `.reveal` quedan con `opacity: 0` | `RevealObserver` marca todo como visible si no hay `IntersectionObserver`. Con reduced-motion el CSS las muestra siempre. |
| El observer no ve secciones montadas tras navegación cliente | `RevealObserver` vive dentro de `app/page.tsx`, así que se monta y desmonta con la página y observa en cada visita. |
| Enlaces olvidados que siguen apuntando a `/` cuando deberían ir a la Biblioteca | El paso 2 lista los cuatro archivos afectados, verificados con `grep -rn 'href="/"'`. |
| Clases del CSS nuevo que choquen con las existentes | Las primeras 930 líneas de ambas plantillas son idénticas. Los bloques nuevos usan prefijos propios (`home-`, `feature-`, `mini-`, `stat-`, `activity-`, `tick-`, `top-`, `price-`/`pc-`, `faq-`, `final-`). |

## Lo que **no** entra en esta spec

- Página "Acerca de", formulario de contacto y su link en el nav.
- Gamepad virtual y variantes de tema.
- Datos reales en actividad, top o stats.
- `/login` abierto directamente en "CREAR CUENTA".
- Cambios de la Home según haya o no sesión.
- Tests automatizados.

Cada uno de estos puntos, si llega, va en su propia spec.
