create extension if not exists pgcrypto;

create table if not exists public.analytics_sites (
  site_id text primary key,
  label text not null,
  url text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  site_id text not null references public.analytics_sites(site_id),
  event_name text not null check (
    event_name in (
      'page_view',
      'assessment_submit',
      'audio_purchase_click',
      'line_click',
      'consultation_booking',
      'payment_success'
    )
  ),
  visitor_id text not null,
  session_id text not null,
  page_url text not null,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists analytics_events_site_created_idx
  on public.analytics_events (site_id, created_at desc);

create index if not exists analytics_events_name_created_idx
  on public.analytics_events (event_name, created_at desc);

create index if not exists analytics_events_visitor_created_idx
  on public.analytics_events (visitor_id, created_at desc);

insert into public.analytics_sites (site_id, label, url)
values
  ('quantum_frequency_assessment', 'Quantum Frequency Assessment', 'https://quantum-frequency-assessment.netlify.app/'),
  ('timewaver_audio_sales', 'TimeWaver Audio Sales', 'https://timewaver-audio-sales.netlify.app/')
on conflict (site_id) do update
set label = excluded.label,
    url = excluded.url;

alter table public.analytics_sites enable row level security;
alter table public.analytics_events enable row level security;
