-- ═══════════════════════════════════════════════════════════════
-- appointment_reminders — reminder queue for all visit types
-- Cron: /api/cron/reminders runs every 5 minutes
-- ═══════════════════════════════════════════════════════════════

create type reminder_type_enum as enum (
  'confirmation',
  '24hr',
  '2hr',
  '10min',
  'status_change',
  'no_show',
  'post_visit'
);

create type reminder_channel_enum as enum (
  'sms',
  'email'
);

create type reminder_status_enum as enum (
  'pending',
  'sent',
  'failed',
  'skipped'
);

create type visit_type_reminder_enum as enum (
  'video',
  'phone',
  'instant',
  'async',
  'refill'
);

create table if not exists appointment_reminders (
  id                uuid primary key default gen_random_uuid(),
  appointment_id    uuid not null references appointments(id) on delete cascade,
  reminder_type     reminder_type_enum not null,
  channel           reminder_channel_enum not null,
  visit_type        visit_type_reminder_enum not null,
  send_at           timestamptz not null,
  sent_at           timestamptz,
  status            reminder_status_enum not null default 'pending',
  message_variant   smallint not null default 1 check (message_variant between 1 and 3),
  template_key      text not null,
  -- recipient data snapshotted at schedule time (no runtime joins needed)
  patient_first_name text,
  patient_email      text,
  patient_phone      text,
  provider_name      text,
  pharmacy_name      text,
  pharmacy_address   text,
  appointment_link   text,
  scheduled_date     text,   -- "Mon, Jan 20"
  scheduled_time     text,   -- "3:30 PM"
  medications        text,   -- comma-separated for refill
  error_message      text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- Index for cron query: pending reminders due now
create index idx_reminders_cron
  on appointment_reminders (status, send_at)
  where status = 'pending';

-- Index for per-appointment lookups
create index idx_reminders_appointment
  on appointment_reminders (appointment_id);

-- Updated_at trigger
create or replace function set_reminder_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger reminder_updated_at
  before update on appointment_reminders
  for each row execute function set_reminder_updated_at();
