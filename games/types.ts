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
