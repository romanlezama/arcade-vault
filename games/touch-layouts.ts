// Diseños del mando táctil por juego (SPEC 09). Cada botón emite la tecla real
// que ya entiende el motor, así que los motores no cambian.
import type { TouchLayout } from "./types";
export const ASTEROIDES_TOUCH: TouchLayout = {
  arrangement: "row",
  directions: [
    {
      code: "ArrowLeft",
      label: "◀",
      ariaLabel: "Girar a la izquierda",
      mode: "hold",
    },
    {
      code: "ArrowRight",
      label: "▶",
      ariaLabel: "Girar a la derecha",
      mode: "hold",
    },
  ],
  actions: [
    {
      code: "ArrowUp",
      label: "PROPULSAR",
      ariaLabel: "Propulsar",
      mode: "hold",
    },
    { code: "Space", label: "DISPARAR", ariaLabel: "Disparar", mode: "tap" },
  ],
};
export const APILA_TOUCH: TouchLayout = {
  arrangement: "row",
  directions: [
    {
      code: "ArrowLeft",
      label: "◀",
      ariaLabel: "Mover a la izquierda",
      mode: "repeat",
    },
    { code: "ArrowDown", label: "▼", ariaLabel: "Bajar", mode: "repeat" },
    {
      code: "ArrowRight",
      label: "▶",
      ariaLabel: "Mover a la derecha",
      mode: "repeat",
    },
  ],
  actions: [
    {
      code: "ArrowUp",
      label: "GIRAR",
      ariaLabel: "Girar la pieza",
      mode: "tap",
    },
    {
      code: "Space",
      label: "CAÍDA",
      ariaLabel: "Dejar caer la pieza",
      mode: "tap",
    },
  ],
};
export const VIBORA_TOUCH: TouchLayout = {
  arrangement: "cross",
  directions: [
    { code: "ArrowUp", label: "▲", ariaLabel: "Arriba", mode: "tap" },
    { code: "ArrowLeft", label: "◀", ariaLabel: "Izquierda", mode: "tap" },
    { code: "ArrowRight", label: "▶", ariaLabel: "Derecha", mode: "tap" },
    { code: "ArrowDown", label: "▼", ariaLabel: "Abajo", mode: "tap" },
  ],
  actions: [],
};
