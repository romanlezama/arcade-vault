"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { GamesSummary } from "@/components/games-summary";
import { GAMES } from "@/lib/games";
import {
  leaderboardFor,
  normalizePlayerName,
  playerBestFor,
  summarizeGames,
  type LeaderboardRow,
} from "@/lib/leaderboard";
import { fetchScores, type ScoreRecord } from "@/lib/scores-db";
import { useUser } from "@/lib/session";
const TOP_CLASS = [" top1", " top2", " top3"];
const SKELETON_ROWS = 6;
const fmt = (n: number) => n.toLocaleString("es-ES");
type Status = "loading" | "error" | "ready";
function PodiumSlot({
  place,
  row,
  loading,
}: {
  place: 1 | 2 | 3;
  row: LeaderboardRow | undefined;
  loading: boolean;
}) {
  const gold = place === 1;
  const variant = gold ? "gold" : place === 2 ? "silver" : "bronze";
  return (
    <div className={`podium-slot ${variant}`}>
      {gold && (
        <div
          className="pixel"
          style={{ fontSize: 9, color: "var(--gold)", letterSpacing: "0.18em" }}
        >
          CAMPEÓN
        </div>
      )}
      <div
        className="rank-num"
        style={gold ? { fontSize: 36, marginTop: 4 } : undefined}
      >
        {String(place).padStart(2, "0")}
      </div>
      {loading ? (
        <>
          <div className="skel-bar podium-skel" />
          <div className="skel-bar podium-skel short" />
        </>
      ) : (
        <>
          <div className="name">{row ? row.name : "—"}</div>
          <div className="score" style={gold ? { fontSize: 20 } : undefined}>
            {row ? fmt(row.score) : "—"}
          </div>
          {row && <div className="date">{row.date}</div>}
        </>
      )}
    </div>
  );
}
export function HallOfFame() {
  const user = useUser();
  const [tab, setTab] = useState(GAMES[0].id);
  const [status, setStatus] = useState<Status>("loading");
  const [records, setRecords] = useState<ScoreRecord[]>([]);
  // Cada REINTENTAR incrementa el contador y vuelve a lanzar la consulta.
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    // Ignora la respuesta si el componente se desmontó (Strict Mode monta dos veces en dev).
    let active = true;
    fetchScores()
      .then((data) => {
        if (!active) return;
        setRecords(data);
        setStatus("ready");
      })
      .catch(() => {
        if (active) setStatus("error");
      });
    return () => {
      active = false;
    };
  }, [attempt]);
  const selectGame = (gameId: string) => {
    setTab(gameId);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const retry = () => {
    setStatus("loading");
    setAttempt((n) => n + 1);
  };
  const game = GAMES.find((g) => g.id === tab) ?? GAMES[0];
  const rows = status === "ready" ? leaderboardFor(records, tab) : [];
  const you =
    status === "ready" && user
      ? playerBestFor(records, tab, normalizePlayerName(user.name))
      : null;
  return (
    <div className="av-hall fade-in">
      <div className="hall-head">
        <h1>SALÓN DE LA FAMA</h1>
        <p className="pixel" style={{ fontSize: 10 }}>
          LOS NOMBRES QUE NUNCA SE BORRAN DE LA PANTALLA
        </p>
      </div>
      <div className="hall-tabs">
        {GAMES.map((g) => (
          <button
            key={g.id}
            className={"chip" + (tab === g.id ? " active" : "")}
            aria-pressed={tab === g.id}
            onClick={() => setTab(g.id)}
          >
            {g.title}
          </button>
        ))}
      </div>
      {status === "error" ? (
        <div className="hall-signal-lost" role="alert">
          <div className="signal-title flicker">SEÑAL PERDIDA</div>
          <p>
            No se pudo cargar el marcador. Comprueba tu conexión y vuelve a
            intentarlo.
          </p>
          <button className="btn magenta" onClick={retry}>
            REINTENTAR
          </button>
        </div>
      ) : (
        <>
          <div className="podium">
            <PodiumSlot
              place={2}
              row={rows[1]}
              loading={status === "loading"}
            />
            <PodiumSlot
              place={1}
              row={rows[0]}
              loading={status === "loading"}
            />
            <PodiumSlot
              place={3}
              row={rows[2]}
              loading={status === "loading"}
            />
          </div>
          <div className="hall-table" aria-busy={status === "loading"}>
            <div className="th">
              <div>RANGO</div>
              <div>JUGADOR</div>
              <div>PUNTUACIÓN</div>
              <div>FECHA</div>
            </div>
            {status === "loading" && (
              <>
                <div className="tr skel-label">
                  CARGANDO<span className="caret">_</span>
                </div>
                {Array.from({ length: SKELETON_ROWS }, (_, i) => (
                  <div
                    key={`skel-${i}`}
                    className="tr skel-row"
                    style={{ animationDelay: `${i * 50}ms` }}
                    aria-hidden="true"
                  >
                    <div
                      className="skel-bar"
                      style={{ animationDelay: `${i * 120}ms` }}
                    />
                    <div
                      className="skel-bar"
                      style={{ animationDelay: `${i * 120}ms` }}
                    />
                    <div
                      className="skel-bar"
                      style={{ animationDelay: `${i * 120}ms` }}
                    />
                    <div
                      className="skel-bar"
                      style={{ animationDelay: `${i * 120}ms` }}
                    />
                  </div>
                ))}
              </>
            )}
            {status === "ready" && rows.length === 0 && (
              <div className="tr hall-empty" key={`${tab}-empty`}>
                <div className="empty-title">SÉ EL PRIMERO</div>
                <p>Nadie ha guardado aún una puntuación en {game.title}.</p>
                <Link href={`/juegos/${game.id}/jugar`} className="btn yellow">
                  JUGAR {game.title}
                </Link>
              </div>
            )}
            {rows.map((r, i) => (
              // La clave incluye la pestaña para que la animación escalonada se repita al cambiar de juego.
              <div
                key={`${tab}-${i}`}
                className={"tr" + (TOP_CLASS[i] ?? "")}
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="rk">#{String(r.rank).padStart(2, "0")}</div>
                <div className="pl">{r.name}</div>
                <div className="sc">{fmt(r.score)}</div>
                <div className="dt">{r.date}</div>
              </div>
            ))}
            {you && user && (
              <>
                <div className="tr you-label">
                  ▸ TU MEJOR MARCA EN {game.title}
                </div>
                <div
                  className="tr you"
                  key={`${tab}-you`}
                  style={{ animationDelay: `${rows.length * 50 + 50}ms` }}
                >
                  <div className="rk" style={{ color: "var(--yellow)" }}>
                    #{String(you.rank).padStart(2, "0")}
                  </div>
                  <div className="pl" style={{ color: "var(--yellow)" }}>
                    {normalizePlayerName(user.name)}
                  </div>
                  <div
                    className="sc"
                    style={{
                      color: "var(--yellow)",
                      textShadow: "0 0 6px rgba(245,255,0,0.5)",
                    }}
                  >
                    {fmt(you.score)}
                  </div>
                  <div className="dt">{you.date}</div>
                </div>
              </>
            )}
          </div>

          <GamesSummary
            summaries={summarizeGames(records, GAMES)}
            onSelect={selectGame}
            activeId={tab}
            loading={status === "loading"}
          />
        </>
      )}
      <div style={{ textAlign: "center", marginTop: 32 }}>
        <Link href="/biblioteca" className="btn lg">
          VOLVER A LA BIBLIOTECA
        </Link>
      </div>
    </div>
  );
}
