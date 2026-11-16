-- Melpud v2.3 — AI training logs + Realtime + kolom yang belum ada.
-- Idempoten: aman dijalankan ulang. Jalankan di Supabase SQL Editor.
--
-- Catatan: migration 001 dijalankan tanpa bagian ALTER TABLE-nya, sehingga
-- trigger updated_at menolak semua UPDATE (error 42703). Baris berikut
-- melengkapi kolomnya.

alter table public.outlets add column if not exists updated_at timestamptz not null default now();
alter table public.products add column if not exists active boolean not null default true;
alter table public.products add column if not exists updated_at timestamptz not null default now();
alter table public.consignment_batches add column if not exists updated_at timestamptz not null default now();
alter table public.expenses add column if not exists updated_at timestamptz not null default now();

-- Perbaikan data satu kali: input di jam 00:00–07:59 WITA tercatat dengan tanggal UTC
-- (kemarin). Tanggal disesuaikan dengan tanggal pembuatan versi WITA. Idempoten.
update public.consignment_batches
set date = (created_at at time zone 'Asia/Makassar')::date
where date = (created_at at time zone 'UTC')::date
  and date < (created_at at time zone 'Asia/Makassar')::date;

update public.expenses
set date = (created_at at time zone 'Asia/Makassar')::date
where date = (created_at at time zone 'UTC')::date
  and date < (created_at at time zone 'Asia/Makassar')::date;

create table if not exists public.ai_logs (
  id text primary key default gen_random_uuid()::text,
  raw_text text not null,
  ai_reason text,
  status text not null default 'PENDING' check (status in ('PENDING', 'LEARNED')),
  mapped_intent text check (
    mapped_intent is null or mapped_intent in ('CREATE_DROP', 'RECONCILE_BATCH', 'SETTLE_PAYMENT', 'RECORD_EXPENSE')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ai_logs add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_ai_logs_status on public.ai_logs (status, created_at desc);

drop trigger if exists trg_touch_ai_logs on public.ai_logs;
create trigger trg_touch_ai_logs before update on public.ai_logs
  for each row execute function public.handle_batch_and_timestamp_updates();

grant select, insert, update, delete on public.ai_logs to anon, authenticated;

-- Realtime: siarkan perubahan semua tabel operasional.
do $$
declare t text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array['outlets', 'products', 'consignment_batches', 'expenses', 'ai_logs']
    loop
      if not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
      ) then
        execute format('alter publication supabase_realtime add table public.%I', t);
      end if;
    end loop;
  end if;
end $$;
