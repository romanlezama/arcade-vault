"use client";
// Canvas de ASTEROIDES (SPEC 04): crea el motor al montar, lo destruye al desmontar
// y expone pause/resume/reset/setSkin por ref (React 19: ref como prop).
// La skin (SPEC 08) llega como prop y se aplica en caliente, sin recrear el motor.
import { useEffect, useImperativeHandle, useRef } from "react";
import { DEFAULT_SKIN, type SkinId } from "../skins";
import type { GameHandle } from "../types";
import {
  createAsteroidesEngine,
  type AsteroidesEngine,
  type AsteroidesSnapshot,
} from "./engine";
export type AsteroidesHandle = Pick<
  AsteroidesEngine,
  "pause" | "resume" | "reset" | "setSkin"
>;
export function AsteroidesCanvas({
  ref,
  onChange,
  skin = DEFAULT_SKIN,
}: {
  // Ref del contrato común (setSkin opcional); el valor expuesto es un AsteroidesHandle.
  ref?: React.Ref<GameHandle>;
  onChange: (snapshot: AsteroidesSnapshot) => void;
  skin?: SkinId;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<AsteroidesEngine | null>(null);
  // Última versión de onChange, para no recrear el motor cuando cambie la función.
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  // Skin con la que se crea el motor; leída de un ref para que cambiarla no lo recree.
  const skinRef = useRef(skin);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = createAsteroidesEngine(
      canvas,
      (snapshot) => onChangeRef.current(snapshot),
      { skin: skinRef.current },
    );
    engineRef.current = engine;
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);
  // Cambio de skin en caliente: no toca la partida.
  useEffect(() => {
    skinRef.current = skin;
    engineRef.current?.setSkin(skin);
  }, [skin]);
  useImperativeHandle<GameHandle, AsteroidesHandle>(
    ref,
    () => ({
      pause: () => engineRef.current?.pause(),
      resume: () => engineRef.current?.resume(),
      reset: () => engineRef.current?.reset(),
      setSkin: (id: SkinId) => engineRef.current?.setSkin(id),
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
