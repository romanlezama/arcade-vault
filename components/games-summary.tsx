import type { GameSummary } from "@/lib/leaderboard";
const fmt = (n: number) => n.toLocaleString("es-ES");
/** Tabla "TODOS LOS JUEGOS" del Salón (SPEC 05): una fila por juego de GAMES. */
export function GamesSummary({
  summaries,
  onSelect,
  activeId,
  loading = false,
}: {
  summaries: GameSummary[];
  onSelect: (gameId: string) => void;
  /** Pestaña activa del Salón, para resaltar su fila. */
  activeId?: string;
  /** Mientras el Salón carga, las celdas de datos se muestran como skeleton. */
  loading?: boolean;
}) {
  return (
    <section
      className="games-summary"
      aria-labelledby="games-summary-title"
      aria-busy={loading}
    >
      <h2 id="games-summary-title">TODOS LOS JUEGOS</h2>
      <div className="hall-table summary-table">
        <div className="th">
          <div>JUEGO</div>
          <div>CAMPEÓN</div>
          <div>MEJOR</div>
          <div>PARTIDAS</div>
        </div>
        {summaries.map((s, i) => (
          <button
            key={s.gameId}
            type="button"
            className={"tr" + (s.gameId === activeId ? " active" : "")}
            style={{ animationDelay: `${i * 40}ms` }}
            aria-current={s.gameId === activeId ? "true" : undefined}
            onClick={() => onSelect(s.gameId)}
          >
            <div className="gm">{s.title}</div>
            {loading ? (
              <>
                <div className="skel-bar" style={{ width: "60%" }} />
                <div className="skel-bar sc-skel" />
                <div className="skel-bar" style={{ width: 28 }} />
              </>
            ) : (
              <>
                <div className={"pl" + (s.champion ? "" : " none")}>
                  {s.champion ?? "—"}
                </div>
                <div className={"sc" + (s.best === null ? " none" : "")}>
                  {s.best === null ? "—" : fmt(s.best)}
                </div>
                <div className={"pt" + (s.plays === 0 ? " none" : "")}>
                  {fmt(s.plays)}
                </div>
              </>
            )}
          </button>
        ))}
      </div>
    </section>
  );
}
