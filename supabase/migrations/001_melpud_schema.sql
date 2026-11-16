-- Melpud Operational & Consignment Management System — schema (PRD v2.0)
-- Idempoten: aman dijalankan berulang. Tempel seluruh file ini ke Supabase SQL Editor.
--
-- Catatan penyesuaian terhadap PRD:
--   * id consignment_batches & expenses memakai TEXT + default gen_random_uuid()::text
--     (bukan UUID) agar cocok dengan tabel yang sudah ada dan id yang dikirim aplikasi.
--   * consignment_batches.product_name dipertahankan karena dipakai UI.

-- ============================================================================
-- A. TABEL & CONSTRAINT
-- ============================================================================
create table if not exists public.outlets (
  id text primary key,
  name text not null,
  contact text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id text primary key,
  name text not null,
  price integer not null check (price >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.consignment_batches (
  id text primary key default gen_random_uuid()::text,
  date date not null default current_date,
  outlet_id text not null references public.outlets(id) on update cascade on delete restrict,
  product_id text not null references public.products(id) on update cascade on delete restrict,
  product_name text,
  qty_drop integer not null check (qty_drop > 0),
  qty_returned integer not null default 0 check (qty_returned >= 0),
  price_unit integer not null default 5000 check (price_unit >= 0),
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'RECONCILED')),
  payment_status text not null default 'UNPAID' check (payment_status in ('UNPAID', 'PAID')),
  paid_at date,
  qty_sold integer generated always as (
    case when status = 'RECONCILED' then greatest(0, qty_drop - qty_returned) else 0 end
  ) stored,
  total_bill integer generated always as (
    case when status = 'RECONCILED' then greatest(0, qty_drop - qty_returned) * price_unit else 0 end
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_return_not_exceed_drop check (qty_returned <= qty_drop)
);

create table if not exists public.expenses (
  id text primary key default gen_random_uuid()::text,
  date date not null default current_date,
  category text not null check (category in ('Bahan Baku Utama', 'Kemasan', 'Operasional Lainnya')),
  description text not null,
  amount integer not null check (amount > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Lengkapi kolom yang belum ada pada tabel lama (idempoten).
alter table public.outlets add column if not exists updated_at timestamptz not null default now();
alter table public.products add column if not exists active boolean not null default true;
alter table public.products add column if not exists updated_at timestamptz not null default now();
alter table public.consignment_batches add column if not exists product_name text;
alter table public.consignment_batches add column if not exists updated_at timestamptz not null default now();
alter table public.consignment_batches alter column id set default gen_random_uuid()::text;
alter table public.expenses add column if not exists updated_at timestamptz not null default now();
alter table public.expenses alter column id set default gen_random_uuid()::text;

-- Constraint tambahan untuk tabel lama.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.consignment_batches'::regclass
      and conname = 'chk_return_not_exceed_drop'
  ) then
    alter table public.consignment_batches
      add constraint chk_return_not_exceed_drop check (qty_returned <= qty_drop);
  end if;
  if not exists (
    select 1 from pg_constraint c
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
    where c.conrelid = 'public.consignment_batches'::regclass
      and c.contype = 'f' and a.attname = 'outlet_id'
  ) then
    alter table public.consignment_batches
      add constraint consignment_batches_outlet_id_fkey
      foreign key (outlet_id) references public.outlets(id)
      on update cascade on delete restrict;
  end if;
  if not exists (
    select 1 from pg_constraint c
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
    where c.conrelid = 'public.consignment_batches'::regclass
      and c.contype = 'f' and a.attname = 'product_id'
  ) then
    alter table public.consignment_batches
      add constraint consignment_batches_product_id_fkey
      foreign key (product_id) references public.products(id)
      on update cascade on delete restrict;
  end if;
end $$;

-- Indexes.
create index if not exists idx_batches_outlet_status
  on public.consignment_batches (outlet_id, status, payment_status);
create index if not exists idx_batches_date
  on public.consignment_batches (date desc);
create index if not exists idx_expenses_date
  on public.expenses (date desc);

-- ============================================================================
-- B. TRIGGER & SEED
-- ============================================================================
create or replace function public.handle_batch_and_timestamp_updates()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();

  if tg_table_name = 'consignment_batches' then
    if new.payment_status = 'PAID'
       and (old.payment_status is distinct from 'PAID')
       and new.paid_at is null then
      new.paid_at = current_date;
    elsif new.payment_status = 'UNPAID' then
      new.paid_at = null;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_touch_outlets on public.outlets;
create trigger trg_touch_outlets before update on public.outlets
  for each row execute function public.handle_batch_and_timestamp_updates();

drop trigger if exists trg_touch_products on public.products;
create trigger trg_touch_products before update on public.products
  for each row execute function public.handle_batch_and_timestamp_updates();

drop trigger if exists trg_touch_batches on public.consignment_batches;
create trigger trg_touch_batches before update on public.consignment_batches
  for each row execute function public.handle_batch_and_timestamp_updates();

drop trigger if exists trg_touch_expenses on public.expenses;
create trigger trg_touch_expenses before update on public.expenses
  for each row execute function public.handle_batch_and_timestamp_updates();

-- Seed awal.
insert into public.outlets (id, name, contact, active) values
  ('p-bungin', 'P. BUNGIN', '0812-3456-7890', true),
  ('p-moyo-conato', 'P. MOYO CONATO', '0813-9876-5432', true),
  ('p-singkep', 'P. SINGKEP', '0811-2233-4455', true),
  ('bubuh-bali', 'BUBUH BALI', '0878-6543-2109', true),
  ('skensa-mami', 'SKENSA MAMI', '0857-1122-3344', true)
on conflict (id) do nothing;

insert into public.products (id, name, price, active) values
  ('pudding-coklat', 'Pudding Coklat', 5000, true)
on conflict (id) do nothing;

-- ============================================================================
-- C. VIEW RINGKASAN KEUANGAN
-- ============================================================================
create or replace view public.view_financial_summary as
with b as (
  select
    coalesce(sum(total_bill) filter (
      where status = 'RECONCILED' and payment_status = 'UNPAID'
    ), 0)::int as total_receivables,
    coalesce(sum(total_bill) filter (
      where status = 'RECONCILED' and payment_status = 'PAID'
    ), 0)::int as real_cash_in
  from public.consignment_batches
), e as (
  select coalesce(sum(amount), 0)::int as total_expenses
  from public.expenses
)
select
  b.total_receivables,
  b.real_cash_in,
  e.total_expenses,
  (b.real_cash_in - e.total_expenses) as net_cash,
  ((b.real_cash_in + b.total_receivables) - e.total_expenses) as projected_profit,
  ((b.real_cash_in - e.total_expenses) < 50000) as low_cash_warning
from b, e;

-- ============================================================================
-- D. RPC AKSI (NLP / UI) — atomik
-- ============================================================================
create or replace function public.execute_melpud_action(p_action text, p_payload jsonb)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_rows jsonb := '[]'::jsonb;
  v_count integer := 0;
  v_outlet text;
  v_it jsonb;
  v_id text;
begin
  if p_action in ('CREATE_DROP', 'BATCH_CREATE_DROP') then
    with raw as (
      select case
        when jsonb_typeof(p_payload -> 'items') = 'array' then p_payload -> 'items'
        else jsonb_build_array(p_payload)
      end as items
    ), it as (
      select
        coalesce(i ->> 'outletId', p_payload ->> 'outletId') as outlet_id,
        coalesce(i ->> 'productId', p_payload ->> 'productId') as product_id,
        coalesce((i ->> 'qty')::int, (p_payload ->> 'qty')::int) as qty,
        coalesce((i ->> 'date')::date, (p_payload ->> 'date')::date, current_date) as date,
        coalesce((i ->> 'priceUnit')::int, (p_payload ->> 'priceUnit')::int) as price_unit
      from raw, jsonb_array_elements(raw.items) i
    ), ins as (
      insert into public.consignment_batches
        (date, outlet_id, product_id, product_name, qty_drop, qty_returned, price_unit, status, payment_status)
      select it.date, it.outlet_id, it.product_id, pr.name, it.qty, 0,
             coalesce(it.price_unit, pr.price), 'ACTIVE', 'UNPAID'
      from it
      join public.products pr on pr.id = it.product_id
      returning *
    )
    select coalesce(jsonb_agg(to_jsonb(ins)), '[]'::jsonb) into v_rows from ins;
    v_count := jsonb_array_length(v_rows);

  elsif p_action = 'RECONCILE_BATCH' then
    v_outlet := p_payload ->> 'outletId';
    with target as (
      select id from public.consignment_batches
      where outlet_id = v_outlet and status = 'ACTIVE'
      order by date asc, created_at asc
      limit 1
    ), upd as (
      update public.consignment_batches b
      set qty_returned = least(b.qty_drop, greatest(0, coalesce((p_payload ->> 'qtyReturned')::int, 0))),
          status = 'RECONCILED',
          payment_status = coalesce(p_payload ->> 'paymentStatus', 'UNPAID')
      from target
      where b.id = target.id
      returning b.*
    )
    select coalesce(jsonb_agg(to_jsonb(upd)), '[]'::jsonb) into v_rows from upd;
    v_count := jsonb_array_length(v_rows);

  elsif p_action = 'BATCH_RECONCILE_MULTI' then
    for v_it in select value from jsonb_array_elements(coalesce(p_payload -> 'items', '[]'::jsonb))
    loop
      select b.id into v_id
      from public.consignment_batches b
      where b.status = 'ACTIVE'
        and (
          b.id = v_it ->> 'batchId'
          or ((v_it ->> 'batchId') is null and b.outlet_id = v_it ->> 'outletId')
        )
      order by b.date asc, b.created_at asc
      limit 1;

      if v_id is not null then
        update public.consignment_batches b
        set qty_returned = least(b.qty_drop, greatest(0, coalesce((v_it ->> 'qtyReturned')::int, 0))),
            status = 'RECONCILED',
            payment_status = coalesce(v_it ->> 'paymentStatus', 'UNPAID')
        where b.id = v_id;

        v_rows := v_rows || jsonb_build_array(
          (select to_jsonb(x) from public.consignment_batches x where x.id = v_id)
        );
      end if;
    end loop;
    v_count := jsonb_array_length(v_rows);

  elsif p_action = 'SETTLE_PAYMENT' then
    v_outlet := coalesce(p_payload ->> 'outletId', 'ALL');
    with upd as (
      update public.consignment_batches b
      set payment_status = 'PAID'
      where b.status = 'RECONCILED'
        and b.payment_status = 'UNPAID'
        and (v_outlet = 'ALL' or b.outlet_id = v_outlet)
      returning b.*
    )
    select coalesce(jsonb_agg(to_jsonb(upd)), '[]'::jsonb) into v_rows from upd;
    v_count := jsonb_array_length(v_rows);

  elsif p_action = 'RECORD_EXPENSE' then
    with ins as (
      insert into public.expenses (date, category, description, amount)
      values (
        coalesce((p_payload ->> 'date')::date, current_date),
        p_payload ->> 'category',
        coalesce(p_payload ->> 'description', ''),
        greatest(1, (p_payload ->> 'amount')::int)
      )
      returning *
    )
    select coalesce(jsonb_agg(to_jsonb(ins)), '[]'::jsonb) into v_rows from ins;
    v_count := jsonb_array_length(v_rows);

  else
    return jsonb_build_object('ok', false, 'error', 'Unknown action: ' || p_action);
  end if;

  return jsonb_build_object('ok', true, 'action', p_action, 'count', v_count, 'rows', v_rows);
end;
$$;

grant execute on function public.execute_melpud_action(text, jsonb) to anon, authenticated;
grant select on public.view_financial_summary to anon, authenticated;
