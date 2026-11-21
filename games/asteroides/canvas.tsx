"use client";
// Canvas de ASTEROIDES (SPEC 04): crea el motor al montar, lo destruye al desmontar
// y expone pause/resume/reset por ref (React 19: ref como prop).
import { useEffect, useImperativeHandle, useRef } from "react";
import {
  createAsteroidesEngine,
  type AsteroidesEngine,
  type AsteroidesSnapshot,
} from "./engine";
export type AsteroidesHandle = Pick<
  AsteroidesEngine,
  "pause" | "resume" | "reset"
>;
export function AsteroidesCanvas({
  ref,
  onChange,
}: {
  ref?: React.Ref<AsteroidesHandle>;
  onChange: (snapshot: AsteroidesSnapshot) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<AsteroidesEngine | null>(null);
  // Última versión de onChange, para no recrear el motor cuando cambie la función.
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = createAsteroidesEngine(canvas, (snapshot) =>
      onChangeRef.current(snapshot),
    );
    engineRef.current = engine;
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);
  useImperativeHandle(
    ref,
    () => ({
      pause: () => engineRef.current?.pause(),
      resume: () => engineRef.current?.resume(),
      reset: () => engineRef.current?.reset(),
    }),
    [],
  );
  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={600}
      style={{ width: "100%", height: "100%", display: "block" }}
    />
  );
}
