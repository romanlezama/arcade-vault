-- Función de diagnóstico para GET /api/health (SPEC 03). No lee datos.
create or replace function public.health()
returns text
language sql
stable
security invoker
set search_path = ''
as $$ select 'ok' $$;
