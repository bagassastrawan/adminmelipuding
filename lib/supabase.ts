import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

export const missingEnvMessage = `Supabase env kosong: ${
  [
    !url && 'NEXT_PUBLIC_SUPABASE_URL',
    !key && 'NEXT_PUBLIC_SUPABASE_ANON_KEY atau NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  ]
    .filter(Boolean)
    .join(' & ')
}. Di Vercel: Settings → Environment Variables, lalu Redeploy.`

// Tanpa fallback URL/key. Kalau env kosong, jangan pernah throw saat render/HMR;
// semua query mengembalikan error yang sama agar UI bisa menampilkannya.
const blocked = {
  from: () => blocked,
  select: () => blocked,
  insert: () => blocked,
  update: () => blocked,
  delete: () => blocked,
  eq: () => blocked,
  order: () => blocked,
  limit: () => blocked,
  channel: () => blocked,
  on: () => blocked,
  subscribe: () => blocked,
  removeChannel: () => undefined,
  then: (resolve: (v: unknown) => unknown) =>
    resolve({ data: null, error: { message: missingEnvMessage } }),
}

export const supabase: SupabaseClient =
  url && key ? createClient(url, key) : (blocked as unknown as SupabaseClient)

export async function checkSupabase() {
  const [outlets, products] = await Promise.all([
    supabase.from('outlets').select('id').limit(1),
    supabase.from('products').select('id').limit(1),
  ])
  const error = outlets.error ?? products.error
  return error
    ? { ok: false, message: error.message }
    : { ok: true, message: 'outlets & products terbaca' }
}
