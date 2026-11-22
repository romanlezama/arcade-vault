// Teclas virtuales (SPEC 09): el mando táctil emite los mismos KeyboardEvent
// que el teclado real, despachados en window. Los motores escuchan en window
// y leen e.code, así que no cambian. El target es window, de modo que su filtro
// de campos de texto (isTextTarget) no los descarta.
// Sin React: lo usan components/touch-controls.tsx y GamePlayer.
/** `key` equivalente a cada `code` que puede emitir el mando. */
const KEY_BY_CODE: Record<string, string> = {
  ArrowLeft: "ArrowLeft",
  ArrowRight: "ArrowRight",
  ArrowUp: "ArrowUp",
  ArrowDown: "ArrowDown",
  Space: " ",
};
function dispatch(type: "keydown" | "keyup", code: string, repeat: boolean) {
  window.dispatchEvent(
    new KeyboardEvent(type, {
      code,
      key: KEY_BY_CODE[code] ?? code,
      repeat,
      bubbles: true,
      cancelable: true,
    }),
  );
}
/** keydown; `repeat: true` para las repeticiones al mantener pulsado. */
export function pressKey(code: string, repeat = false) {
  dispatch("keydown", code, repeat);
}
/** keyup. */
export function releaseKey(code: string) {
  dispatch("keyup", code, false);
}
/** Pulsación completa: keydown y keyup seguidos. */
export function tapKey(code: string) {
  pressKey(code);
  releaseKey(code);
}
