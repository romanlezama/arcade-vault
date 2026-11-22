"use client";
// Mando táctil (SPEC 09): pinta un grupo (direcciones o acciones) de un
// TouchLayout y traduce los toques a teclas virtuales (lib/virtual-keys.ts).
import { useEffect, useRef, useState } from "react";
import type { TouchButton, TouchLayout } from "@/games/types";
import { pressKey, releaseKey, tapKey } from "@/lib/virtual-keys";
const REPEAT_DELAY_MS = 170;
const REPEAT_INTERVAL_MS = 50;
function TouchKey({
  button,
  variant,
}: {
  button: TouchButton;
  variant: "direction" | "action";
}) {
  const { code, mode, label, ariaLabel } = button;
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
      className={`touch-btn touch-btn--${variant}`}
      data-code={code}
      data-pressed={pressed || undefined}
      aria-label={ariaLabel}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onLostPointerCapture={onPointerEnd}
      onPointerMove={onPointerMove}
      onContextMenu={(e) => e.preventDefault()}
    >
      {variant === "action" ? (
        <>
          <span className="touch-btn__cap" aria-hidden="true" />
          <span className="touch-btn__label" aria-hidden="true">
            {label}
          </span>
        </>
      ) : (
        <span aria-hidden="true">{label}</span>
      )}
    </button>
  );
}
export function TouchControls({
  layout,
  slot,
}: {
  layout: TouchLayout;
  slot: "directions" | "actions";
}) {
  const buttons = slot === "directions" ? layout.directions : layout.actions;
  if (buttons.length === 0) return null;
  const cross = slot === "directions" && layout.arrangement === "cross";
  return (
    <div
      className={`touch-pad touch-pad--${slot}${cross ? " touch-pad--cross" : ""}`}
      role="group"
      aria-label={slot === "directions" ? "Direcciones" : "Acciones"}
    >
      {buttons.map((b) => (
        <TouchKey
          key={b.code}
          button={b}
          variant={slot === "directions" ? "direction" : "action"}
        />
      ))}
    </div>
  );
}
