-- Blocage temporaire anti-abus (3 appels / 30 min → 24 h)
create table if not exists phone_blocks (
  caller         text primary key,
  blocked_until  timestamptz not null,
  reason         text,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

create index if not exists phone_blocks_until_idx on phone_blocks(blocked_until);
