# Juegos con skins

> Mantenido por el subagente `skin-designer`. Una fila por juego real (`GAME_REGISTRY`); se actualiza, no se duplica.
> Skins obligatorias: `clasico` (default), `neon`, `retro`. Todas validadas sobre fondo oscuro.

| Juego      | clasico | neon | retro | Estado    | Spec | Actualizado |
| ---------- | ------- | ---- | ----- | --------- | ---- | ----------- |
| asteroides | ✅      | ✅   | ✅    | Implementado | `specs/08-skins-asteroides.md` | 2026-11-22  |
| apila      | ❌      | ⚠️   | ❌    | Sin skins | —    | 2026-11-22  |
| vibora     | ❌      | ⚠️   | ❌    | Sin skins | —    | 2026-11-22  |

Leyenda: ✅ implementada y validada · 📝 en spec (Borrador/Aprobado) · ⚠️ paleta actual única, aún sin sistema de skins · ❌ falta.

Estados: `Sin skins` → `Spec creada` → `Implementado`.

## Contrato de skins

Definido en `specs/08-skins-asteroides.md` (Implementado). Resumen:

- `games/skins.ts`: `SkinId = "clasico" | "neon" | "retro"`, `SKIN_IDS`, `SKIN_LABELS` (`CLÁSICO`, `NEÓN`, `RETRO`), `DEFAULT_SKIN = "clasico"`, `isSkinId`.
- Motor: tipo de paleta propio (`<Juego>Palette`, un campo por rol, hex sólidos `#rrggbb`, factor `glow` que multiplica los `shadowBlur` base) y `SKINS: Record<SkinId, Palette>`. Firma `createXEngine(canvas, onChange, { skin? })`; `setSkin(id)` en el handle (redibuja si está en pausa, no toca el estado de juego). Sin `getComputedStyle`.
- `games/types.ts`: `GameHandle.setSkin?(id)` y `GameCanvasProps.skin?` (opcionales: los juegos sin skins no cambian).
- `games/registry.ts`: `GameEntry.skins?: readonly SkinId[]`; si existe, `GamePlayer` muestra el selector.
- Canvas: prop `skin`, motor creado con la skin inicial, `useEffect([skin])` → `setSkin`.
- `lib/skin.ts`: `useSkin()` / `setSkinPreference()` con el patrón `useSyncExternalStore` de `lib/session.ts`; clave global `av_skin` (texto plano); servidor/primer render = `DEFAULT_SKIN`; valor inválido → `DEFAULT_SKIN`.
- `components/game-player.tsx`: selector SKIN (botones con `aria-pressed`, `blur()` tras el clic) solo si `entry.skins`.

## Notas por juego

### asteroides (2026-11-22)

- Spec `specs/08-skins-asteroides.md` (Implementado); define además el contrato de skins. Capturas en `.playwright-screenshots/skins-asteroides-*.png`.
- Sin rejilla ni borde de tablero: esos roles no aplican. Roles: fondo, nave, llama, asteroide, partícula, bala, power-up, vida, HUD label/valor/contador 3x, overlay título/sub, GAME OVER.
- CLÁSICO: vector blanco/gris sobre `#000`, power-up verde `#66ff66`, GAME OVER rojo `#ff4040`, sin glow.
- NEÓN: idéntica a la paleta actual (alfas convertidas a hex sólido: llama `#d96e00`, subtítulo `#9697a6`), glow ×1.
- RETRO: fósforo ámbar monocromo sobre `#0a0700`, glow ×0,35, sin scanlines propias (ya las pone `.crt-screen::after`).
- Ratios más justos: partícula RETRO 3,65:1 (decorativa), llama/nave RETRO 1,66:1, nave/asteroide RETRO 2,53:1.
