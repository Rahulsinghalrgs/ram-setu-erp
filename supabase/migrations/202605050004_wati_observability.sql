alter table public.communication_logs
  add column if not exists provider_response jsonb,
  add column if not exists status_checked_at timestamptz;

create table if not exists public.wati_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider_message_id text,
  status text not null default 'callback',
  error_message text,
  payload jsonb not null default '{}'::jsonb,
  matched_log boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists wati_webhook_events_message_idx
  on public.wati_webhook_events (provider_message_id, created_at desc);
