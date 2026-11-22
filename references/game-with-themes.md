# Juegos con skins

> Mantenido por el subagente `skin-designer`. Una fila por juego real (`GAME_REGISTRY`); se actualiza, no se duplica.
> Skins obligatorias: `clasico` (default), `neon`, `retro`. Todas validadas sobre fondo oscuro.

| Juego      | clasico | neon | retro | Estado    | Spec | Actualizado |
| ---------- | ------- | ---- | ----- | --------- | ---- | ----------- |
| asteroides | ❌      | ⚠️   | ❌    | Sin skins | —    | 2026-11-22  |
| apila      | ❌      | ⚠️   | ❌    | Sin skins | —    | 2026-11-22  |
| vibora     | ❌      | ⚠️   | ❌    | Sin skins | —    | 2026-11-22  |

Leyenda: ✅ implementada y validada · 📝 en spec (Borrador/Aprobado) · ⚠️ paleta actual única, aún sin sistema de skins · ❌ falta.

Estados: `Sin skins` → `Spec creada` → `Implementado`.

## Contrato de skins

Pendiente: lo define la primera spec de skins (`games/skins.ts`, `SKINS` por motor, `setSkin` en el handle, selector en `GamePlayer`, persistencia en `localStorage` `av_skin`).

## Notas por juego
