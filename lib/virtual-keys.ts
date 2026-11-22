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
// Pulsaciones mantenidas por code (SPEC 10): dos botones pueden mantener la
// misma tecla (▲ y B propulsan en ASTEROIDES). Solo el primero envía keydown
// y solo el último en soltarse envía keyup.
const held = new Map<string, number>();
/**
 * keydown al empezar a mantener (cuenta la pulsación).
 * `repeat: true` = repetición mientras se mantiene: se despacha siempre y no cuenta.
 */
export function pressKey(code: string, repeat = false) {
  if (repeat) {
    dispatch("keydown", code, true);
    return;
  }
  const n = held.get(code) ?? 0;
  held.set(code, n + 1);
  if (n === 0) dispatch("keydown", code, false);
}
/** Deja de mantener; keyup solo cuando se suelta la última pulsación. */
export function releaseKey(code: string) {
  const n = held.get(code) ?? 0;
  if (n === 0) return; // nunca baja de 0
  if (n === 1) {
    held.delete(code);
    dispatch("keyup", code, false);
  } else {
    held.set(code, n - 1);
  }
}
/** Pulsación completa: keydown y keyup seguidos, sin contador. */
export function tapKey(code: string) {
  dispatch("keydown", code, false);
  dispatch("keyup", code, false);
}
