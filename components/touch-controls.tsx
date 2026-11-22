"use client";
// Mando táctil (SPEC 09, contrato de SPEC 10): cruceta de 4 posiciones y
// botones A/B de un TouchLayout; traduce los toques a teclas virtuales
// (lib/virtual-keys.ts). Un botón sin TouchButton se pinta apagado.
import { useEffect, useRef, useState } from "react";
import type { TouchButton, TouchLayout } from "@/games/types";
import { pressKey, releaseKey, tapKey } from "@/lib/virtual-keys";
const REPEAT_DELAY_MS = 170;
const REPEAT_INTERVAL_MS = 50;
function TouchKey({
  button,
  className,
  pos,
  children,
}: {
  button?: TouchButton;
  className: string;
  pos: string; // posición fija en el mando: "up", "left"… "a", "b"
  children: React.ReactNode;
}) {
  if (!button)
    return (
      <button
        type="button"
        tabIndex={-1}
        className={className}
        data-pos={pos}
        disabled
        aria-label="Sin uso"
      >
        {children}
      </button>
    );
  return (
    <ActiveKey button={button} className={className} pos={pos}>
      {children}
    </ActiveKey>
  );
}
function ActiveKey({
  button,
  className,
  pos,
  children,
}: {
  button: TouchButton;
  className: string;
  pos: string;
  children: React.ReactNode;
}) {
  const { code, mode, ariaLabel } = button;
  const [pressed, setPressed] = useState(false);
  // Dedo que tiene apoyado este botón (null = libre). Cada botón sigue el suyo:
  // así varios dedos pulsan botones distintos a la vez.
  const pointerRef = useRef<number | null>(null);
  const delayRef = useRef<number | undefined>(undefined);
  const intervalRef = useRef<number | undefined>(undefined);
  const releaseRef = useRef<() => void>(() => {});
  function stopRepeat() {
    window.clearTimeout(delayRef.current);
    window.clearInterval(intervalRef.current);
  }
  // Suelta la tecla si este botón la tiene pulsada. Idempotente.
  function release() {
    if (pointerRef.current === null) return;
    pointerRef.current = null;
    stopRepeat();
    if (mode !== "tap") releaseKey(code);
    setPressed(false);
  }
  useEffect(() => {
    releaseRef.current = release;
  });
  // Ninguna tecla queda pegada: pestaña oculta, ventana sin foco o desmontaje.
  useEffect(() => {
    const onHidden = () => {
      if (document.hidden) releaseRef.current();
    };
    const onBlur = () => releaseRef.current();
    document.addEventListener("visibilitychange", onHidden);
    window.addEventListener("blur", onBlur);
    return () => {
      document.removeEventListener("visibilitychange", onHidden);
      window.removeEventListener("blur", onBlur);
      releaseRef.current();
    };
  }, []);
  function onPointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    e.preventDefault(); // sin foco, sin ratón emulado, sin selección
    if (pointerRef.current !== null) return;
    pointerRef.current = e.pointerId;
    e.currentTarget.setPointerCapture(e.pointerId);
    setPressed(true);
    if (mode === "tap") {
      tapKey(code);
      return;
    }
    pressKey(code);
    if (mode === "repeat") {
      // Primera repetición a los REPEAT_DELAY_MS; después, una cada REPEAT_INTERVAL_MS.
      delayRef.current = window.setTimeout(() => {
        pressKey(code, true);
        intervalRef.current = window.setInterval(
          () => pressKey(code, true),
          REPEAT_INTERVAL_MS,
        );
      }, REPEAT_DELAY_MS);
    }
  }
  function onPointerEnd(e: React.PointerEvent<HTMLButtonElement>) {
    if (e.pointerId === pointerRef.current) release();
  }
  // Con la captura activa no llega pointerleave: si el dedo sale del botón, se suelta.
  function onPointerMove(e: React.PointerEvent<HTMLButtonElement>) {
    if (e.pointerId !== pointerRef.current) return;
    const r = e.currentTarget.getBoundingClientRect();
    if (
      e.clientX < r.left ||
      e.clientX > r.right ||
      e.clientY < r.top ||
      e.clientY > r.bottom
    )
      release();
  }
  return (
    <button
      type="button"
      tabIndex={-1}
      className={className}
      data-pos={pos}
      data-pressed={pressed || undefined}
      aria-label={ariaLabel}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onLostPointerCapture={onPointerEnd}
      onPointerMove={onPointerMove}
      onContextMenu={(e) => e.preventDefault()}
    >
      {children}
    </button>
  );
}
// Panel "Gamepad MK-II" (SPEC 10, referencia en references/gamepad-assets/):
// cruceta de 4 teclas con núcleo luminoso y botones B (cian) y A (magenta).
// Flechas en SVG, como la referencia, para no depender de la fuente.
const ARROWS = {
  up: "M12 4 L20 16 L4 16 Z",
  right: "M8 4 L20 12 L8 20 Z",
  down: "M4 8 L20 8 L12 20 Z",
  left: "M16 4 L16 20 L4 12 Z",
} as const;
const DPAD = ["up", "right", "down", "left"] as const;
export function TouchControls({ layout }: { layout: TouchLayout }) {
  return (
    <div className="gp" role="group" aria-label="Mando">
      <div className="gp-body">
        <div className="gp-zone gp-zone--dpad">
          <div className="gp-dpad" role="group" aria-label="Cruceta">
            {DPAD.map((pos) => (
              <TouchKey
                key={pos}
                button={layout.dpad[pos]}
                className={`dp dp-${pos}`}
                pos={pos}
              >
                <svg
                  className="dp-arrow"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d={ARROWS[pos]} fill="currentColor" />
                </svg>
              </TouchKey>
            ))}
            <div className="dp-hub" aria-hidden="true">
              <span className="dp-hub-gem" />
            </div>
          </div>
        </div>
        <div className="gp-zone gp-zone--ab">
          <div className="gp-actions" role="group" aria-label="Botones A y B">
            {(["b", "a"] as const).map((pos) => (
              <TouchKey
                key={pos}
                button={layout[pos]}
                className={`ab ${pos}`}
                pos={pos}
              >
                <span className="ab-ring" aria-hidden="true" />
                <span className="ab-letter" aria-hidden="true">
                  {pos.toUpperCase()}
                </span>
              </TouchKey>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
