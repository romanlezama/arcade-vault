"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { GAME_REGISTRY } from "@/games/registry";
import { SKIN_LABELS } from "@/games/skins";
import type { GameHandle, GameSnapshot } from "@/games/types";
import type { Game } from "@/lib/games";
import { normalizePlayerName } from "@/lib/leaderboard";
import { insertScore } from "@/lib/scores-db";
import { useUser } from "@/lib/session";
import { setSkinPreference, useSkin } from "@/lib/skin";
import { tapKey } from "@/lib/virtual-keys";
import { TouchControls } from "./touch-controls";
// Estados en los que tocar el CRT arranca o reinicia la partida (SPEC 09).
const TAP_TO_START = new Set(["ready", "gameover", "won"]);
type Run = { score: number; level: number };
const INITIAL_RUN: Run = { score: 0, level: 1 };
// Solo da tipo al estado en los juegos simulados; no se muestra nunca.
const NO_SNAPSHOT: GameSnapshot = {
  status: "ready",
  paused: false,
  score: 0,
  lives: 0,
  level: 1,
};
export function GamePlayer({ game }: { game: Game }) {
  const user = useUser();
  // Skin global (SPEC 08): clasico en el servidor y en el primer render.
  const skin = useSkin();
  // Los juegos con motor real están en el registro (SPEC 06); el resto sigue
  // con la partida simulada.
  const entry = GAME_REGISTRY[game.id];
  const isReal = Boolean(entry);
  const handleRef = useRef<GameHandle>(null);
  const [snapshot, setSnapshot] = useState<GameSnapshot>(
    entry?.initialSnapshot ?? NO_SNAPSHOT,
  );
  const [run, setRun] = useState<Run>(INITIAL_RUN);
  const [simLives, setSimLives] = useState(3);
  const [simPaused, setSimPaused] = useState(false);
  const [over, setOver] = useState(false);
  // Puntuación congelada al pulsar FIN: es la que muestra el modal y la que se guarda.
  const [finalScore, setFinalScore] = useState(0);
  // null = el jugador aún no ha editado el nombre: se usa el del usuario o "INVITADO".
  // Así el nombre se actualiza cuando la sesión aparece tras hidratar.
  const [editedName, setEditedName] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  // Cada partida tiene su propio intento de guardado: si JUGAR DE NUEVO llega antes
  // de que termine la petición, su resultado se ignora.
  const saveAttempt = useRef(0);
  const name = editedName ?? normalizePlayerName(user ? user.name : "INVITADO");
  // En los juegos reales el motor es la fuente de verdad, incluida la pausa.
  const score = isReal ? snapshot.score : run.score;
  const level = isReal ? snapshot.level : run.level;
  const lives = isReal ? snapshot.lives : simLives;
  const paused = isReal ? snapshot.paused : simPaused;
  // Puntuación simulada: sube sola mientras no hay pausa ni fin.
  // Igual que la plantilla, sube de nivel cuando la puntuación cae en los
  // primeros 100 puntos de cada bloque de 2500.
  useEffect(() => {
    if (isReal || over || paused) return;
    const t = setInterval(() => {
      const delta = Math.floor(10 + Math.random() * 90);
      setRun((r) => {
        const next = r.score + delta;
        return {
          score: next,
          level: next % 2500 < 100 ? r.level + 1 : r.level,
        };
      });
    }, 220);
    return () => clearInterval(t);
  }, [isReal, over, paused]);
  // Toque en el CRT (SPEC 09): arranca o reinicia la partida en táctil, solo
  // en ready/gameover/won. Durante la partida no hace nada; el ratón se ignora.
  const onScreenPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!entry?.touch || e.pointerType === "mouse") return;
    if (TAP_TO_START.has(snapshot.status)) tapKey("Space");
  };
  const togglePause = () => {
    if (!isReal) {
      setSimPaused((p) => !p);
    } else if (paused) {
      handleRef.current?.resume();
    } else {
      handleRef.current?.pause();
    }
  };
  const finish = () => {
    if (isReal) handleRef.current?.pause();
    setFinalScore(score);
    setOver(true);
  };
  const restart = () => {
    if (isReal) handleRef.current?.reset();
    setRun(INITIAL_RUN);
    setSimLives(3);
    setSimPaused(false);
    setOver(false);
    saveAttempt.current++;
    setSaveState("idle");
  };
  const onSave = async () => {
    if (!name || saveState === "saving" || saveState === "saved") return;
    const attempt = ++saveAttempt.current;
    setSaveState("saving");
    try {
      await insertScore({
        gameId: game.id,
        playerName: name,
        score: finalScore,
      });
      if (attempt === saveAttempt.current) setSaveState("saved");
    } catch {
      if (attempt === saveAttempt.current) setSaveState("error");
    }
  };
  return (
    <div className="av-player fade-in">
      <div className="player-hud">
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div className="hud-stat">
            <div className="l">Jugador</div>
            <div className="v" style={{ color: "var(--ink)" }}>
              {name}
            </div>
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
          {entry?.skins && (
            <div
              className="skin-picker"
              role="group"
              aria-label="Skin del juego"
            >
              {entry.skins.map((id) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={skin === id}
                  onClick={(e) => {
                    setSkinPreference(id);
                    // Sin foco, Espacio sigue llegando al juego y no reactiva el botón.
                    e.currentTarget.blur();
                  }}
                >
                  {SKIN_LABELS[id]}
                </button>
              ))}
            </div>
          )}
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
      <div className={`play-stage${entry?.touch ? " has-touch" : ""}`}>
        <div className="crt">
          <div className="crt-screen" onPointerDown={onScreenPointerDown}>
            {entry ? (
              <entry.Canvas
                ref={handleRef}
                onChange={setSnapshot}
                skin={skin}
              />
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
              <div
                className="crt-content"
                style={{ background: "rgba(0,0,0,0.6)", zIndex: 5 }}
              >
                <div>
                  <div className="pixel neon-yellow" style={{ fontSize: 22 }}>
                    EN PAUSA
                  </div>
                  <div
                    className="mono"
                    style={{
                      fontSize: 11,
                      color: "var(--ink-dim)",
                      marginTop: 10,
                      letterSpacing: "0.16em",
                    }}
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
        {entry?.touch && <TouchControls layout={entry.touch} />}
      </div>
      {over && (
        <div className="modal-bd">
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="game-over-title"
          >
            <h2 id="game-over-title">FIN DEL JUEGO</h2>
            <div className="final-label">PUNTUACIÓN FINAL</div>
            <div className="final">{finalScore.toLocaleString("es-ES")}</div>
            {saveState !== "saved" ? (
              <>
                <div className="input-row">
                  <input
                    value={name}
                    onChange={(e) =>
                      setEditedName(normalizePlayerName(e.target.value))
                    }
                    placeholder="TUS INICIALES"
                    aria-label="Tus iniciales"
                    disabled={saveState === "saving"}
                  />
                  <button
                    className={`btn yellow${saveState === "saving" ? " is-busy" : ""}`}
                    onClick={onSave}
                    disabled={!name || saveState === "saving"}
                    aria-busy={saveState === "saving"}
                  >
                    {saveState === "saving" ? (
                      <>
                        GUARDANDO<span className="caret">_</span>
                      </>
                    ) : (
                      "GUARDAR PUNTUACIÓN"
                    )}
                  </button>
                </div>
                {saveState === "error" && (
                  <div className="toast-error" role="alert">
                    ERROR AL GUARDAR
                  </div>
                )}
              </>
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
