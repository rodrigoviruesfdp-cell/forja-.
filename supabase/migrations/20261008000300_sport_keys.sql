-- =============================================================================
-- Sports are stored as a fixed code ('boxing', 'surf'...) instead of the
-- translated name ('Boxeo'), so history counts the same in any language
-- (see docs/DECISIONES.md, "Decisiones tomadas ahora"). A sport that is not in
-- the list keeps the name the user typed.
--
-- Same aliases as src/domain/sports.ts (accents removed, lowercase). Safe to
-- run twice: rows that already hold a code are left alone.
-- =============================================================================

create or replace function public.canonical_sport(value text)
returns text
language sql
immutable
set search_path = ''
as $$
  select coalesce(
    (
      select code
      from (values
        ('futbol', 'football'), ('football', 'football'), ('soccer', 'football'),
        ('padel', 'padel'),
        ('running', 'running'), ('correr', 'running'), ('carrera', 'running'),
        ('ciclismo', 'cycling'), ('cycling', 'cycling'), ('bici', 'cycling'), ('bicicleta', 'cycling'),
        ('natacion', 'swimming'), ('swimming', 'swimming'), ('nadar', 'swimming'),
        ('surf', 'surf'), ('surfing', 'surf'),
        ('boxeo', 'boxing'), ('boxing', 'boxing'),
        ('artes marciales', 'martial_arts'), ('martial arts', 'martial_arts'),
        ('escalada', 'climbing'), ('climbing', 'climbing'),
        ('tenis', 'tennis'), ('tennis', 'tennis'),
        ('baloncesto', 'basketball'), ('basketball', 'basketball'), ('basket', 'basketball'),
        ('voleibol', 'volleyball'), ('voley', 'volleyball'), ('volleyball', 'volleyball'),
        ('esqui', 'skiing'), ('skiing', 'skiing'), ('ski', 'skiing'),
        ('yoga', 'yoga'),
        ('senderismo', 'hiking'), ('hiking', 'hiking'), ('trekking', 'hiking')
      ) as aliases (alias, code)
      where alias = regexp_replace(lower(translate(btrim(value), 'ÁÉÍÓÚÜÑáéíóúüñ', 'AEIOUUNaeiouun')), '\s+', ' ', 'g')
    ),
    value
  );
$$;

-- The updated_at trigger bumps each changed row, so phones download the new value.
update public.routine_days set sport = public.canonical_sport(sport)
where sport is not null and sport is distinct from public.canonical_sport(sport);

update public.sessions set sport = public.canonical_sport(sport)
where sport is not null and sport is distinct from public.canonical_sport(sport);

-- Only needed for this conversion (the app canonicalizes from now on).
drop function public.canonical_sport(text);
