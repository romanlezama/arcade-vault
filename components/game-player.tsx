"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AsteroidesCanvas, type AsteroidesHandle } from "@/games/asteroides/canvas";
import type { AsteroidesSnapshot } from "@/games/asteroides/engine";
import type { Game } from "@/lib/games";
import { saveScore, useUser } from "@/lib/session";

type Run = { score: number; level: number };

const INITIAL_RUN: Run = { score: 0, level: 1 };

const INITIAL_ASTEROIDES: AsteroidesSnapshot = {
  status: "ready",
  paused: false,
  score: 0,
  lives: 3,
  level: 1,
};

function normalizeName(value: string) {
  return value.toUpperCase().slice(0, 10);
}

export function GamePlayer({ game }: { game: Game }) {
  const user = useUser();
  // ASTEROIDES es el único juego real (SPEC 04); el resto sigue con la partida simulada.
  const isAsteroides = game.id === "asteroides";
  const asteroidesRef = useRef<AsteroidesHandle>(null);
  const [snapshot, setSnapshot] = useState<AsteroidesSnapshot>(INITIAL_ASTEROIDES);

  const [run, setRun] = useState<Run>(INITIAL_RUN);
  const [simLives, setSimLives] = useState(3);
  const [simPaused, setSimPaused] = useState(false);
  const [over, setOver] = useState(false);
  // Puntuación congelada al pulsar FIN: es la que muestra el modal y la que se guarda.
  const [finalScore, setFinalScore] = useState(0);
  // null = el jugador aún no ha editado el nombre: se usa el del usuario o "INVITADO".
  // Así el nombre se actualiza cuando la sesión aparece tras hidratar.
  const [editedName, setEditedName] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const name = editedName ?? normalizeName(user ? user.name : "INVITADO");
  // El motor es la fuente de verdad de ASTEROIDES, incluida la pausa.
  const score = isAsteroides ? snapshot.score : run.score;
  const level = isAsteroides ? snapshot.level : run.level;
  const lives = isAsteroides ? snapshot.lives : simLives;
  const paused = isAsteroides ? snapshot.paused : simPaused;

  // Puntuación simulada: sube sola mientras no hay pausa ni fin.
  // Igual que la plantilla, sube de nivel cuando la puntuación cae en los
  // primeros 100 puntos de cada bloque de 2500.
  useEffect(() => {
    if (isAsteroides || over || paused) return;
    const t = setInterval(() => {
      const delta = Math.floor(10 + Math.random() * 90);
      setRun((r) => {
        const next = r.score + delta;
        return { score: next, level: next % 2500 < 100 ? r.level + 1 : r.level };
      });
    }, 220);
    return () => clearInterval(t);
  }, [isAsteroides, over, paused]);

  const togglePause = () => {
    if (!isAsteroides) {
      setSimPaused((p) => !p);
    } else if (paused) {
      asteroidesRef.current?.resume();
    } else {
      asteroidesRef.current?.pause();
    }
  };

  const finish = () => {
    if (isAsteroides) asteroidesRef.current?.pause();
    setFinalScore(score);
    setOver(true);
  };

  const restart = () => {
    if (isAsteroides) asteroidesRef.current?.reset();
    setRun(INITIAL_RUN);
    setSimLives(3);
    setSimPaused(false);
    setOver(false);
    setSaved(false);
  };

  const onSave = () => {
    saveScore({ game: game.id, score: finalScore, name });
    setSaved(true);
  };

  return (
    <div className="av-player fade-in">
      <div className="player-hud">
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div className="hud-stat">
            <div className="l">Jugador</div>
            <div className="v" style={{ color: "var(--ink)" }}>{name}</div>
          </div>
          <div className="hud-stat">
            <div className="l">Puntuación</div>
            <div className="v">{score.toLocaleString("es-ES")}</div>
          </div>
          <div className="hud-stat lives">
            <div className="l">Vidas</div>
            <div className="v">{"♥ ".repeat(lives).trim() || "—"}</div>
          </div>
          <div className="hud-stat level">
            <div className="l">Nivel</div>
            <div className="v">{String(level).padStart(2, "0")}</div>
          </div>
        </div>
        <div className="hud-actions">
          <button className="btn yellow" onClick={togglePause}>
            {paused ? "REANUDAR" : "PAUSA"}
          </button>
          <button className="btn magenta" onClick={finish}>
            FIN
          </button>
          <Link href={`/juegos/${game.id}`} className="btn ghost">
            SALIR
          </Link>
        </div>
      </div>

      <div className="crt">
        <div className="crt-screen">
          {isAsteroides ? (
            <AsteroidesCanvas ref={asteroidesRef} onChange={setSnapshot} />
          ) : (
            <div className="game-arena" aria-hidden="true">
              <div className="grid-floor"></div>
              <div className="enemy e1"></div>
              <div className="enemy e2"></div>
              <div className="enemy e3"></div>
              <div className="player-ship"></div>
            </div>
          )}
          {paused && (
            <div className="crt-content" style={{ background: "rgba(0,0,0,0.6)", zIndex: 5 }}>
              <div>
                <div className="pixel neon-yellow" style={{ fontSize: 22 }}>
                  EN PAUSA
                </div>
                <div
                  className="mono"
                  style={{ fontSize: 11, color: "var(--ink-dim)", marginTop: 10, letterSpacing: "0.16em" }}
                >
                  PULSA REANUDAR PARA CONTINUAR
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="crt-bottom">
          <span className="led">SEÑAL OK</span>
          <span>{game.title} · CRT-83 · 60 HZ</span>
          <span>CARGA · 1MB</span>
        </div>
      </div>

      {over && (
        <div className="modal-bd">
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="game-over-title">
            <h2 id="game-over-title">FIN DEL JUEGO</h2>
            <div className="final-label">PUNTUACIÓN FINAL</div>
            <div className="final">{finalScore.toLocaleString("es-ES")}</div>
            {!saved ? (
              <div className="input-row">
                <input
                  value={name}
                  onChange={(e) => setEditedName(normalizeName(e.target.value))}
                  placeholder="TUS INICIALES"
                  aria-label="Tus iniciales"
                />
                <button className="btn yellow" onClick={onSave}>
                  GUARDAR PUNTUACIÓN
                </button>
              </div>
            ) : (
              <div className="toast-saved">▸ PUNTUACIÓN GUARDADA_</div>
            )}
            <div className="actions">
              <button className="btn" onClick={restart}>
                JUGAR DE NUEVO
              </button>
              <Link href="/biblioteca" className="btn magenta">
                VOLVER AL VAULT
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
