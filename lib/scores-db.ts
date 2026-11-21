// Acceso a la tabla public.scores desde el navegador (SPEC 05).
import { createClient } from "@/lib/supabase/client";
export type ScoreRecord = {
  gameId: string;
  playerName: string;
  score: number;
  /** ISO de created_at */
  createdAt: string;
};
/** Hasta 1000 puntuaciones, de mayor a menor. Lanza Error si Supabase falla. */
export async function fetchScores(): Promise<ScoreRecord[]> {
  const { data, error } = await createClient()
    .from("scores")
    .select("game_id, player_name, score, created_at")
    .order("score", { ascending: false })
    .limit(1000);
  if (error) throw new Error(error.message);
  return data.map((row) => ({
    gameId: row.game_id,
    playerName: row.player_name,
    score: row.score,
    createdAt: row.created_at,
  }));
}
/** Inserta una puntuación. Lanza Error si Supabase falla. */
export async function insertScore(entry: {
  gameId: string;
  playerName: string;
  score: number;
}): Promise<void> {
  const { error } = await createClient().from("scores").insert({
    game_id: entry.gameId,
    player_name: entry.playerName,
    score: entry.score,
  });
  if (error) throw new Error(error.message);
}
