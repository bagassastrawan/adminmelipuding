-- Melpud v2.4 — RPC aksi kanonik untuk AI Quick-Log & tombol pelunasan.
-- Idempoten (create or replace). Jalankan setelah migration 001, di Supabase SQL Editor.
--
-- Kenapa ditulis ulang: RPC pada proyek live membaca kunci payload berbeda
-- (qty_drop & product_name tidak terisi sehingga CREATE_DROP selalu gagal
-- dengan 42702/23502) dan mengembalikan bentuk respons berbeda
-- ({ok, action, affected} tanpa rows). Fungsi di bawah adalah kontrak resmi
-- yang dipakai aplikasi: { ok, action, count, rows }.
--
-- Aturan yang dijaga:
--   * RECONCILE_BATCH / BATCH_RECONCILE_MULTI tidak pernah mengubah
--     payment_status menjadi PAID kecuali diminta eksplisit lewat payload.
--   * SETTLE_PAYMENT hanya menyentuh baris RECONCILED + UNPAID milik outlet
--     yang disebut (atau 'ALL'), sehingga batch PAID lain tidak tersentuh.
--   * current_date dihitung dalam WITA supaya tanggal default tidak meleset.

create or replace function public.execute_melpud_action(p_action text, p_payload jsonb)
returns jsonb
language plpgsql
-- set search_path & timezone harus dua klausa SET terpisah: search_path adalah
-- GUC multi-nilai, jadi "set a = x, b = y" akan terbaca sebagai daftar search_path.
set search_path to public
set timezone to 'Asia/Makassar'
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
        -- batchId dari kartu konfirmasi menang supaya batch yang ditampilkan
        -- = batch yang diubah; tanpa batchId, perilaku lama (tertua dulu).
        and (nullif(p_payload ->> 'batchId', '') is null
             or id = nullif(p_payload ->> 'batchId', ''))
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
    return jsonb_build_object('ok', false, 'error', 'Action tidak dikenal: ' || coalesce(p_action, '(null)'));
  end if;

  return jsonb_build_object('ok', true, 'action', p_action, 'count', v_count, 'rows', v_rows);
end;
$$;

grant execute on function public.execute_melpud_action(text, jsonb) to anon, authenticated;
