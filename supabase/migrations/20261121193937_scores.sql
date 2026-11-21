-- SPEC 05 — Leaderboard real: puntuaciones guardadas desde el modal "FIN DEL JUEGO".
-- Inserción anónima limitada por constraints; sin UPDATE ni DELETE desde la API.
create table public.scores (
  id          bigint generated always as identity primary key,
  game_id     text        not null,
  player_name text        not null,
  score       integer     not null,
  created_at  timestamptz not null default now(),

  -- Debe ir a la par con GAMES (lib/games.ts): añadir un juego exige una migración nueva.
  constraint scores_game_id_check check (game_id in (
    'bloque-buster', 'caida', 'serpentina', 'gloton', 'invasores',
    'rocas', 'ranaria', 'duelo-pixel', 'asteroides'
  )),
  constraint scores_player_name_check check (
    char_length(player_name) between 1 and 10
    and player_name = upper(player_name)
  ),
  constraint scores_score_check check (score between 0 and 10000000)
);

create index scores_game_score_idx on public.scores (game_id, score desc, created_at);

alter table public.scores enable row level security;

create policy "scores: lectura pública" on public.scores
  for select to anon, authenticated using (true);

create policy "scores: inserción pública" on public.scores
  for insert to anon, authenticated with check (true);

grant select, insert on public.scores to anon, authenticated;
