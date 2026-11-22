"use client";
// Canvas de VÍBORA (SPEC 07): crea el motor al montar, lo destruye al desmontar
// y expone pause/resume/reset por ref (React 19: ref como prop).
import { useEffect, useImperativeHandle, useRef } from "react";
import {
  createViboraEngine,
  type ViboraEngine,
  type ViboraSnapshot,
} from "./engine";
export type ViboraHandle = Pick<
  ViboraEngine,
  "pause" | "resume" | "reset"
>;
export function ViboraCanvas({
  ref,
  onChange,
}: {
  ref?: React.Ref<ViboraHandle>;
  onChange: (snapshot: ViboraSnapshot) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<ViboraEngine | null>(null);
  // Última versión de onChange, para no recrear el motor cuando cambie la función.
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = createViboraEngine(canvas, (snapshot) =>
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
