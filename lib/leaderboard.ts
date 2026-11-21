// Cálculo del ranking en el cliente (SPEC 05). Funciones puras: sin React ni Supabase.
import type { Game } from "@/lib/games";
import type { ScoreRecord } from "@/lib/scores-db";
export type LeaderboardRow = {
  /** 1..10 */
  rank: number;
  name: string;
  score: number;
  /** "DD/MM/YYYY", de createdAt */
  date: string;
};
export type PlayerBest = { rank: number; score: number; date: string };
export type GameSummary = {
  gameId: string;
  title: string;
  /** null si el juego no tiene puntuaciones */
  champion: string | null;
  best: number | null;
  /** Filas guardadas de ese juego, no jugadores únicos */
  plays: number;
};
export function normalizePlayerName(value: string): string {
  return value.toUpperCase().slice(0, 10);
}
/** created_at en la zona horaria del navegador como DD/MM/YYYY. */
function formatDate(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}
/** Mayor puntuación primero; con empate, el created_at más antiguo primero. */
function compareRecords(a: ScoreRecord, b: ScoreRecord): number {
  if (a.score !== b.score) return b.score - a.score;
  return Date.parse(a.createdAt) - Date.parse(b.createdAt);
}
/** Ranking completo de un juego: la mejor marca de cada jugador, ordenada. */
function rankedBests(records: ScoreRecord[], gameId: string): ScoreRecord[] {
  const bests = new Map<string, ScoreRecord>();
  for (const r of records) {
    if (r.gameId !== gameId) continue;
    const current = bests.get(r.playerName);
    if (!current || compareRecords(r, current) < 0) bests.set(r.playerName, r);
  }
  return [...bests.values()].sort(compareRecords);
}
export function leaderboardFor(
  records: ScoreRecord[],
  gameId: string,
  limit = 10,
): LeaderboardRow[] {
  return rankedBests(records, gameId)
    .slice(0, limit)
    .map((r, i) => ({
      rank: i + 1,
      name: r.playerName,
      score: r.score,
      date: formatDate(r.createdAt),
    }));
}
export function playerBestFor(
  records: ScoreRecord[],
  gameId: string,
  name: string,
): PlayerBest | null {
  const ranked = rankedBests(records, gameId);
  const index = ranked.findIndex((r) => r.playerName === name);
  if (index === -1) return null;
  const r = ranked[index];
  return { rank: index + 1, score: r.score, date: formatDate(r.createdAt) };
}
export function summarizeGames(
  records: ScoreRecord[],
  games: Game[],
): GameSummary[] {
  return games.map((game) => {
    const top = rankedBests(records, game.id)[0];
    return {
      gameId: game.id,
      title: game.title,
      champion: top ? top.playerName : null,
      best: top ? top.score : null,
      plays: records.filter((r) => r.gameId === game.id).length,
    };
  });
}
