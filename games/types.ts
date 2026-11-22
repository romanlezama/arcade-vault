// Contrato común de los motores reales (SPEC 06): lo que GamePlayer necesita
// de cualquier juego para mostrar el HUD, pausar, terminar y reiniciar.
import type { SkinId } from "./skins";
export type GameSnapshot = {
  status: string; // cada motor usa su propia unión
  paused: boolean;
  score: number;
  lives: number;
  level: number;
};
export type GameHandle = {
  pause(): void;
  resume(): void;
  reset(): void;
  setSkin?(id: SkinId): void; // opcional: los juegos sin skins no lo implementan (SPEC 08)
};
export type GameCanvasProps = {
  ref?: React.Ref<GameHandle>;
  onChange: (snapshot: GameSnapshot) => void;
  skin?: SkinId; // los juegos sin skins lo ignoran (SPEC 08)
};
// ── Mando táctil (SPEC 09) ───────────────────────────────────────────────────
// hold: keydown al apoyar, keyup al levantar.
// tap: keydown + keyup al apoyar.
// repeat: keydown al apoyar, repeticiones mientras se mantiene, keyup al levantar.
export type TouchButtonMode = "hold" | "tap" | "repeat";
// Contrato del mando (SPEC 10): cruceta de 4 posiciones + botones A y B.
// Un botón que falta se pinta apagado (disabled) y no envía nada.
export type TouchButton = {
  code: string; // KeyboardEvent.code a emitir: "ArrowLeft", "Space"…
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
  a?: TouchButton; // acción principal (Espacio)
  b?: TouchButton; // acción secundaria
};
