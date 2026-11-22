// Registro de motores reales (SPEC 06). Un juego sin entrada sigue con la
// partida simulada en GamePlayer.
import { ApilaCanvas } from "./apila/canvas";
import { AsteroidesCanvas } from "./asteroides/canvas";
import { ViboraCanvas } from "./vibora/canvas";
import { SKIN_IDS, type SkinId } from "./skins";
import { APILA_TOUCH, ASTEROIDES_TOUCH, VIBORA_TOUCH } from "./touch-layouts";
import type { GameCanvasProps, GameSnapshot, TouchLayout } from "./types";
export type GameEntry = {
  Canvas: React.ComponentType<GameCanvasProps>;
  initialSnapshot: GameSnapshot;
  skins?: readonly SkinId[]; // si existe, GamePlayer muestra el selector (SPEC 08)
  touch?: TouchLayout; // si existe, GamePlayer pinta el mando táctil (SPEC 09)
};
export const GAME_REGISTRY: Partial<Record<string, GameEntry>> = {
  asteroides: {
    Canvas: AsteroidesCanvas,
    touch: ASTEROIDES_TOUCH,
    skins: SKIN_IDS,
    initialSnapshot: {
      status: "ready",
      paused: false,
      score: 0,
      lives: 3,
      level: 1,
    },
  },
  apila: {
    Canvas: ApilaCanvas,
    touch: APILA_TOUCH,
    initialSnapshot: {
      status: "ready",
      paused: false,
      score: 0,
      lives: 0,
      level: 1,
    },
  },
  vibora: {
    Canvas: ViboraCanvas,
    touch: VIBORA_TOUCH,
    initialSnapshot: {
      status: "ready",
      paused: false,
      score: 0,
      lives: 3,
      level: 1,
    },
  },
};
