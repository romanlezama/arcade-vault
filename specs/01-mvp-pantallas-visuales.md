# SPEC 01 — MVP visual: todas las pantallas de Arcade Vault

> **Estado:** Implementado
> **Depende de:** —
> **Fecha:** 2026-11-07
> **Objetivo:** Portar a Next.js App Router las cinco pantallas de la plantilla de `references/resources/templates/` (Biblioteca, Detalle, Reproductor, Auth y Salón de la Fama) con navegación, datos mock y persistencia simulada en localStorage, sin implementar ningún juego real.

## Por qué existe esta spec

La plantilla es un prototipo HTML que monta React desde un CDN y navega con un router por hash. El tema visual (`app/globals.css`) y las fuentes ya están portados. Falta convertir cada pantalla en rutas y componentes reales de Next 16 para tener un MVP navegable. El resultado debe verse igual que la plantilla. Sobre esa base se implementarán después los juegos y el backend.

## Alcance

**Entra:**

- Rutas reales del App Router:
  - `/` → Biblioteca
  - `/juegos/[id]` → Detalle
  - `/juegos/[id]/jugar` → Reproductor
  - `/login` → Auth
  - `/salon` → Salón de la Fama
- La barra de navegación (`Nav`) y el footer en el layout raíz, presentes en todas las rutas. Incluye el panel móvil con hamburguesa.
- Datos mock tipados en TypeScript: los 8 juegos, las categorías, la lista de jugadores y el generador determinista de puntuaciones (`seededScores`).
- Biblioteca: hero, búsqueda por nombre, chips de categoría, grid de tarjetas con efecto tilt y estado vacío "NO HAY RESULTADOS".
- Detalle: portada, tags, descripción larga, stat-strip, botones "JUGAR AHORA" y "VOLVER AL VAULT", y leaderboard de 10 filas.
- Reproductor: HUD, arena CRT animada en CSS y puntuación simulada que sube sola con un timer. Incluye subida de nivel, PAUSA/REANUDAR, FIN, SALIR y el modal "FIN DEL JUEGO" con "GUARDAR PUNTUACIÓN", "JUGAR DE NUEVO" y "VOLVER AL VAULT".
- Auth: pestañas "INICIAR SESIÓN" y "CREAR CUENTA", con el campo de correo solo en "CREAR CUENTA". Incluye el botón "JUGAR COMO INVITADO" y los botones sociales decorativos.
- Login simulado: cualquier usuario entra. El nombre se guarda en mayúsculas y se recorta a 10 caracteres; si queda vacío, se usa `PLAYER1`.
- Sesión y puntuaciones en localStorage con las mismas claves que la plantilla (`av_user`, `av_scores`).
- Salón de la Fama: pestañas por juego, podio, tabla de 12 filas con animación escalonada y fila "TU MEJOR MARCA" cuando hay usuario.
- Página 404 con el tema arcade (`app/not-found.tsx`), usada para ids de juego inexistentes.
- Excluir `references/**` de ESLint para que `npm run lint` pase.

**Fuera de alcance (para specs futuras):**

- Cualquier juego real o lógica de juego. La arena del reproductor es decorativa.
- Autenticación real, backend o base de datos.
- Login social funcional (GOOGLE / GITHUB).
- Que el Salón de la Fama muestre las puntuaciones guardadas en `av_scores`.
- Sistema de créditos. "CRÉDITOS · 03" es texto fijo.
- Menú desplegable de usuario.
- Reflejar filtros o pestañas en la URL mediante search params.
- Tests automatizados.

## Modelo de datos

```ts
// lib/games.ts
export type Category = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
export type CoverClass =
  | "cover-bricks" | "cover-tetro" | "cover-snake" | "cover-glot"
  | "cover-invaders" | "cover-rocas" | "cover-rana" | "cover-duelo";

export type Game = {
  id: string;          // slug usado en la URL: "bloque-buster"
  title: string;       // "BLOQUE BUSTER"
  short: string;       // descripción corta (tarjeta)
  long: string;        // descripción larga (detalle)
  cat: Category;
  cover: CoverClass;   // clase CSS de la portada en globals.css
  color: "cyan" | "magenta" | "yellow" | "green"; // variante del botón JUGAR
  best: number;
  plays: string;       // "12.4K"
};

export const GAMES: Game[];                                  // los 8 juegos de data.jsx, mismo orden y textos
export const CATEGORIES = ["TODOS", "ARCADE", "PUZZLE", "SHOOTER", "VERSUS"] as const;
export function getGame(id: string): Game | undefined;
```

```ts
// lib/scores.ts
export type ScoreRow = { rank: number; name: string; score: number; date: string }; // date: "DD/MM/2026"
export const PLAYERS: string[];                               // los 18 nombres de data.jsx
export function seededScores(seed: number, count?: number): ScoreRow[]; // mismo algoritmo que data.jsx
```

```ts
// lib/session.ts (solo cliente)
export type SessionUser = { name: string };                                     // clave "av_user"
export type SavedScore = { game: string; score: number; name: string; at: number }; // clave "av_scores" (array)
```

`lib/session.ts` expone el hook `useUser()`, construido con `useSyncExternalStore`. El hook se acompaña de `signIn(user)`, `signOut()` y `saveScore(entry)`. Todo acceso a localStorage va dentro de `try/catch`.

Convenciones:

- Semillas de puntuaciones, iguales a la plantilla:
  - Detalle: `id.length * 17 + 3`, con 10 filas.
  - Salón: `id.length * 23 + 7`, con 12 filas.
- Números formateados con `toLocaleString("es-ES")`.
- El servidor y el primer render del cliente usan `null` como usuario, para evitar errores de hidratación.

## Plan de implementación

1. **Datos y lint.** Crear `lib/games.ts` y `lib/scores.ts` con el modelo de arriba. Añadir `references/**` a los ignores de `eslint.config.mjs`. Prueba manual: `npm run lint` y `npx tsc --noEmit` pasan.
2. **Sesión.** Crear `lib/session.ts` con `useUser`, `signIn`, `signOut` y `saveScore`. El hook debe notificar a los suscriptores al escribir y escuchar el evento `storage`. Prueba manual: `npm run build` pasa.
3. **Layout: Nav y footer.**
   - Crear `components/nav.tsx` (Client Component). Debe usar `usePathname` para el link activo: Biblioteca se marca activa en `/` y en `/juegos/*`. Incluye el panel móvil y el botón de usuario o de "Iniciar Sesión".
   - Crear `components/footer.tsx`.
   - Montar ambos en `app/layout.tsx` alrededor de `<main className="av-main">`.
   - Prueba manual: el nav y el footer aparecen en `/`, y la hamburguesa abre el panel a ≤840px.
4. **Biblioteca.**
   - Crear `components/game-card.tsx` (cliente, con tilt y enlace a `/juegos/[id]`).
   - Crear `components/library.tsx` (cliente, con búsqueda, chips, grid y estado vacío).
   - Reemplazar `app/page.tsx` por el hero más `<Library />`.
   - Prueba manual: filtrar por "PUZZLE" muestra solo CAÍDA; buscar "zzz" muestra "NO HAY RESULTADOS".
5. **Detalle y 404.**
   - Crear `app/juegos/[id]/page.tsx` (Server Component). Debe usar `generateStaticParams` sobre `GAMES` y `await params`. Llama a `notFound()` si el id no existe.
   - Crear `components/leaderboard.tsx`.
   - Crear `app/not-found.tsx` con el texto "JUEGO NO ENCONTRADO" y un enlace a `/`.
   - Prueba manual: `/juegos/caida` muestra el detalle y `/juegos/xyz` muestra la 404 arcade.
6. **Reproductor.**
   - Crear `app/juegos/[id]/jugar/page.tsx` (servidor). Resuelve el juego y renderiza `components/game-player.tsx`.
   - `game-player.tsx` es cliente: HUD, arena, timer de puntuación, pausa, FIN, modal y `saveScore`.
   - El nombre del modal se inicializa con el usuario o con "INVITADO". Se convierte a mayúsculas y se limita a 10 caracteres.
   - Prueba manual: la puntuación sube; PAUSA la detiene; FIN abre el modal; GUARDAR añade una entrada a `av_scores`.
7. **Auth.**
   - Crear `app/login/page.tsx` y `components/auth-form.tsx` (cliente).
   - Al enviar: llama a `signIn` y navega a `/` con `useRouter().push`.
   - "JUGAR COMO INVITADO" llama a `signOut` y navega a `/`.
   - Prueba manual: entrar como "px_kai" muestra "PX_KAI ▾" en el nav. Pulsarlo cierra sesión.
8. **Salón de la Fama.**
   - Crear `app/salon/page.tsx` y `components/hall-of-fame.tsx` (cliente, con pestañas, podio y tabla).
   - Con usuario, añadir la fila "TU MEJOR MARCA" con el cálculo ficticio de la plantilla:
     - rango `8 + (id.length % 4)`
     - puntuación `rows[5].score - 2400`
     - fecha `11/05/2026`
   - Prueba manual: cambiar de pestaña regenera el podio y la tabla.

## Criterios de aceptación

- [ ] `npm run build` termina sin errores. Las rutas `/`, `/login`, `/salon` y las 8 rutas `/juegos/[id]` se prerenderizan.
- [ ] `npm run lint` termina sin errores.
- [ ] La consola del navegador no muestra errores de hidratación en ninguna ruta.
- [ ] Cada pantalla coincide visualmente con su equivalente en `references/resources/templates/Arcade Vault.html`, abiertas lado a lado a 1440px y a 390px de ancho.
- [ ] El link activo del nav es "Biblioteca" en `/`, `/juegos/caida` y `/juegos/caida/jugar`, y "Salón de la Fama" en `/salon`.
- [ ] En la Biblioteca, el chip "SHOOTER" muestra exactamente INVASORES y ROCAS.
- [ ] Buscar "ser" muestra solo SERPENTINA.
- [ ] Hacer clic en una tarjeta o en su botón JUGAR navega a `/juegos/<id>`.
- [ ] `/juegos/no-existe` muestra la página 404 arcade con un enlace que vuelve a `/`.
- [ ] El leaderboard de `/juegos/caida` muestra 10 filas, con estilos de oro, plata y bronce en las tres primeras.
- [ ] En el reproductor, la puntuación aumenta mientras no está en pausa.
- [ ] PAUSA muestra "EN PAUSA" y congela la puntuación.
- [ ] SALIR navega a `/juegos/<id>`.
- [ ] FIN abre el modal "FIN DEL JUEGO" con la puntuación final.
- [ ] "GUARDAR PUNTUACIÓN" añade `{ game, score, name, at }` a `localStorage["av_scores"]` y muestra "▸ PUNTUACIÓN GUARDADA_".
- [ ] "JUGAR DE NUEVO" reinicia la puntuación a 0, las vidas a 3 y el nivel a 01.
- [ ] En `/login`, la pestaña "CREAR CUENTA" muestra el campo de correo y "INICIAR SESIÓN" lo oculta.
- [ ] Enviar el formulario con usuario "px_kai" guarda `{"name":"PX_KAI"}` en `localStorage["av_user"]`, redirige a `/` y el nav muestra "PX_KAI ▾".
- [ ] Pulsar el botón de usuario en el nav borra `av_user` y vuelve a mostrar "Iniciar Sesión".
- [ ] La sesión persiste tras recargar la página.
- [ ] El Salón muestra el podio (02 · 01 · 03) y 12 filas en la tabla.
- [ ] La fila "TU MEJOR MARCA EN <JUEGO>" aparece solo con sesión iniciada.
- [ ] Con localStorage bloqueado (modo privado o almacenamiento deshabilitado), todas las pantallas renderizan sin lanzar excepciones.

## Decisiones

- **Sí:** rutas reales del App Router (`/`, `/juegos/[id]`, `/juegos/[id]/jugar`, `/login`, `/salon`). Son enlazables, funcionan con el botón atrás y permiten prerender estático.
- **No:** una sola página con estado que decide la pantalla, como la plantilla. Obligaría a que todo fuera cliente y las URLs no se podrían compartir.
- **Sí:** localStorage con las claves `av_user` y `av_scores`, igual que la plantilla. Permite probar el flujo completo sin backend.
- **No:** auth real o base de datos. Se sale de "solo visual"; irán en su propia spec.
- **Sí:** reproductor con puntuación simulada por timer, como la plantilla. Permite recorrer el flujo pausa → fin → guardar sin un juego real.
- **Sí:** nombre "Arcade Vault". Coincide con la plantilla, el repo y el tema. "Arcade Bot" en la petición era un error.
- **Sí:** 404 con el tema arcade vía `notFound()` y `generateStaticParams` para los 8 juegos.
- **No:** redirigir los ids inválidos a `/`. Oculta el error al usuario.
- **Sí:** filtros de la Biblioteca y pestaña del Salón como estado local (`useState`). Es simple y fiel a la plantilla.
- **No:** search params en la URL. Con Cache Components exigen límites de `<Suspense>` adicionales y no aportan al MVP.
- **Sí:** mantener los decorativos de la plantilla: "CRÉDITOS · 03" fijo, botones GOOGLE/GITHUB sin acción, y el botón "NOMBRE ▾" que cierra sesión directamente.
- **Sí:** una sola spec con un paso por pantalla. Es un port visual de un diseño cerrado y cada paso es commitable por separado.
- **No:** dividir en dos specs. El diseño ya está decidido, así que dividir añadiría coordinación sin reducir riesgo.
- **Sí:** reproducir los datos y el algoritmo de `seededScores` tal cual. Es determinista, así que el servidor y el cliente generan los mismos datos y no hay errores de hidratación.
- **Sí:** fila "TU MEJOR MARCA" con el cálculo ficticio de la plantilla, sin leer `av_scores`. Conectar puntuaciones reales al Salón es otra spec.
- **Sí:** componentes servidor por defecto (páginas, leaderboard y footer). Se usa `"use client"` solo donde hay estado, eventos o localStorage.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Error de hidratación porque el nav lee localStorage | `useUser` usa `useSyncExternalStore` con `getServerSnapshot` que devuelve `null`. El nombre aparece tras hidratar. |
| `usePathname` o el contenido cliente rompen el prerender con `cacheComponents` | Las páginas no leen datos dinámicos. Si el build lo exige, se envuelve `Nav` en `<Suspense>` dentro del layout. |
| El timer del reproductor sigue corriendo al salir de la ruta | El `setInterval` se limpia en el cleanup del `useEffect`. |
| `params` es una Promise en Next 16 | Las páginas dinámicas hacen `await params`. Se revisa `node_modules/next/dist/docs/` antes de implementar. |
| Diferencias visuales porque Tailwind va sin preflight | Ya decidido en el tema global: se usan las clases de `globals.css` y no utilidades que dependan del reset. |

## Lo que **no** entra en esta spec

- Juegos reales o cualquier lógica de juego.
- Autenticación real, backend o base de datos.
- Login con Google o GitHub.
- Salón de la Fama alimentado por puntuaciones reales.
- Sistema de créditos.
- Menú desplegable de usuario.
- Filtros en la URL.
- Tests automatizados.

Cada uno de estos puntos, si llega, va en su propia spec.
