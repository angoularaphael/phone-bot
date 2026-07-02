-- ════════════════════════════════════════════════════════════════════
-- Boxing Center — Phone Bot
-- Schéma Supabase : table de suivi des appels entrants
-- ════════════════════════════════════════════════════════════════════

-- ─── Table principale ────────────────────────────────────────────────────────

create table if not exists phone_calls (
  id                  bigserial     primary key,
  call_sid            text          unique not null,   -- identifiant Twilio de l'appel
  caller              text,                            -- numéro appelant (From)
  called              text,                            -- numéro appelé (To)

  -- Motif d'appel
  motif               text,                            -- clé interne (ex: seance_essai)
  motif_label         text,                            -- libellé lisible

  -- Statut
  status              text          default 'in_progress',
  -- valeurs possibles : in_progress | completed | transferred | callback_requested | abandoned

  -- Coordonnées collectées
  caller_name         text,                            -- prénom recueilli par le bot
  caller_phone        text,                            -- mobile saisi ou déduit du From

  -- Actions
  sms_sent            boolean       default false,
  whatsapp_sent       boolean       default false,
  transferred_to      text,                            -- numéro vers lequel l'appel a été transféré
  callback_requested  boolean       default false,

  -- Données techniques
  duration_sec        integer,                         -- durée de l'appel (fourni par Twilio)
  recording_url       text,                            -- URL de l'enregistrement vocal si activé
  raw_digits          text,                            -- séquence de touches enregistrées

  notes               text,                            -- remarques libres / erreurs

  created_at          timestamptz   default now(),
  updated_at          timestamptz   default now()
);

-- ─── Trigger updated_at ──────────────────────────────────────────────────────

create or replace function phone_calls_update_timestamp()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists phone_calls_updated_at on phone_calls;
create trigger phone_calls_updated_at
  before update on phone_calls
  for each row execute function phone_calls_update_timestamp();

-- ─── Index ────────────────────────────────────────────────────────────────────

create index if not exists phone_calls_call_sid_idx    on phone_calls(call_sid);
create index if not exists phone_calls_caller_idx      on phone_calls(caller);
create index if not exists phone_calls_motif_idx       on phone_calls(motif);
create index if not exists phone_calls_status_idx      on phone_calls(status);
create index if not exists phone_calls_created_at_idx  on phone_calls(created_at desc);

-- ─── Vue tableau de bord ──────────────────────────────────────────────────────

create or replace view phone_calls_dashboard as
select
  date_trunc('day', created_at)::date           as jour,
  motif,
  motif_label,
  count(*)                                       as total_appels,
  count(*) filter (where sms_sent)               as sms_envoyes,
  count(*) filter (where callback_requested)     as rappels_demandes,
  count(*) filter (where transferred_to is not null) as transferts,
  count(*) filter (where status = 'abandoned')   as abandons,
  round(avg(duration_sec) filter (where duration_sec > 0)) as duree_moy_sec
from phone_calls
group by 1, 2, 3
order by 1 desc, total_appels desc;

-- ─── Vue demandes de rappel en attente ───────────────────────────────────────

create or replace view pending_callbacks as
select
  id,
  call_sid,
  caller,
  caller_name,
  caller_phone,
  motif,
  motif_label,
  created_at
from phone_calls
where callback_requested = true
  and status             = 'callback_requested'
order by created_at desc;

-- ─── Commentaires ────────────────────────────────────────────────────────────

comment on table  phone_calls                  is 'Suivi des appels entrants — Bot téléphonique Boxing Center';
comment on column phone_calls.call_sid         is 'Identifiant unique Twilio (CallSid)';
comment on column phone_calls.motif            is 'Catégorie du motif d''appel';
comment on column phone_calls.status           is 'État de l''appel : in_progress | completed | transferred | callback_requested | abandoned';
comment on column phone_calls.sms_sent         is 'SMS d''information envoyé à l''appelant';
comment on column phone_calls.callback_requested is 'Demande de rappel enregistrée';
