"use client";
// Canvas de APILA (SPEC 06): crea el motor al montar, lo destruye al desmontar
// y expone pause/resume/reset por ref (React 19: ref como prop).
import { useEffect, useImperativeHandle, useRef } from "react";
import {
  createApilaEngine,
  type ApilaEngine,
  type ApilaSnapshot,
} from "./engine";
export type ApilaHandle = Pick<
  ApilaEngine,
  "pause" | "resume" | "reset"
>;
export function ApilaCanvas({
  ref,
  onChange,
}: {
  ref?: React.Ref<ApilaHandle>;
  onChange: (snapshot: ApilaSnapshot) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<ApilaEngine | null>(null);
  // Última versión de onChange, para no recrear el motor cuando cambie la función.
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = createApilaEngine(canvas, (snapshot) =>
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
