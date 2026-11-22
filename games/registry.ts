// Registro de motores reales (SPEC 06). Un juego sin entrada sigue con la
// partida simulada en GamePlayer.
import { ApilaCanvas } from "./apila/canvas";
import { AsteroidesCanvas } from "./asteroides/canvas";
import { ViboraCanvas } from "./vibora/canvas";
import type { GameCanvasProps, GameSnapshot } from "./types";

export type GameEntry = {
  Canvas: React.ComponentType<GameCanvasProps>;
  initialSnapshot: GameSnapshot;
};

export const GAME_REGISTRY: Partial<Record<string, GameEntry>> = {
  asteroides: {
    Canvas: AsteroidesCanvas,
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
    initialSnapshot: {
      status: "ready",
      paused: false,
      score: 0,
      lives: 3,
      level: 1,
    },
  },
};
