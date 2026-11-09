import Link from "next/link";
import type { Game } from "@/lib/games";

// Tarjeta compacta del rail "JUEGOS DISPONIBLES AHORA" (SPEC 02).
export function MiniCard({ game }: { game: Game }) {
  return (
    <Link href={`/juegos/${game.id}`} className="mini-card">
      <div className="mini-cover">
        <div className={"cover-bg " + game.cover}></div>
      </div>
      <div className="mini-meta">
        <div className="mini-title">{game.title}</div>
        <div className="mini-cat">{game.cat}</div>
      </div>
    </Link>
  );
}
