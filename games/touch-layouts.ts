// Diseños del mando táctil por juego (SPEC 09, mapeo de SPEC 10). Cada botón
// emite la tecla real que ya entiende el motor, así que los motores no cambian.
// A es siempre la acción principal (Espacio); B la secundaria. Un botón que
// falta se pinta apagado.
import type { TouchLayout } from "./types";
export const ASTEROIDES_TOUCH: TouchLayout = {
  dpad: {
    up: { code: "ArrowUp", ariaLabel: "Propulsar", mode: "hold" },
    left: {
      code: "ArrowLeft",
      ariaLabel: "Girar a la izquierda",
      mode: "hold",
    },
    right: {
      code: "ArrowRight",
      ariaLabel: "Girar a la derecha",
      mode: "hold",
    },
    // down: sin uso
  },
  a: { code: "Space", ariaLabel: "Disparar", mode: "tap" },
  // B también propulsa: pulgar izquierdo gira, derecho propulsa y dispara.
  b: { code: "ArrowUp", ariaLabel: "Propulsar", mode: "hold" },
};
export const APILA_TOUCH: TouchLayout = {
  dpad: {
    up: { code: "ArrowUp", ariaLabel: "Girar la pieza", mode: "tap" },
    down: { code: "ArrowDown", ariaLabel: "Bajar", mode: "repeat" },
    left: {
      code: "ArrowLeft",
      ariaLabel: "Mover a la izquierda",
      mode: "repeat",
    },
    right: {
      code: "ArrowRight",
      ariaLabel: "Mover a la derecha",
      mode: "repeat",
    },
  },
  a: { code: "Space", ariaLabel: "Dejar caer la pieza", mode: "tap" },
  b: { code: "ArrowUp", ariaLabel: "Girar la pieza", mode: "tap" },
};
export const VIBORA_TOUCH: TouchLayout = {
  dpad: {
    up: { code: "ArrowUp", ariaLabel: "Arriba", mode: "tap" },
    down: { code: "ArrowDown", ariaLabel: "Abajo", mode: "tap" },
    left: { code: "ArrowLeft", ariaLabel: "Izquierda", mode: "tap" },
    right: { code: "ArrowRight", ariaLabel: "Derecha", mode: "tap" },
  },
  // Espacio solo arranca o reinicia; en partida VÍBORA lo ignora.
  a: { code: "Space", ariaLabel: "Empezar o reiniciar", mode: "tap" },
  // b: sin uso
};
