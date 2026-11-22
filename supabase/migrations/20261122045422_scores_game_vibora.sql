-- SPEC 07 — VÍBORA: añade 'vibora' a los juegos admitidos en scores.
-- Debe ir a la par con GAMES (lib/games.ts).
alter table public.scores drop constraint scores_game_id_check;
alter table public.scores add constraint scores_game_id_check check (game_id in (
  'bloque-buster', 'caida', 'serpentina', 'gloton', 'invasores',
  'rocas', 'ranaria', 'duelo-pixel', 'asteroides', 'apila', 'vibora'
));
