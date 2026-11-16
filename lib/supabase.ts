import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const missingEnvMessage = `Supabase env kosong: ${
  [!url && 'NEXT_PUBLIC_SUPABASE_URL', !key && 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY']
    .filter(Boolean)
    .join(' & ') || 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'
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
  limit: () => blocked,
  then: (resolve: (v: unknown) => unknown) =>
    resolve({ data: null, error: { message: missingEnvMessage } }),
}

export const supabase: SupabaseClient =
  url && key ? createClient(url, key) : (blocked as unknown as SupabaseClient)

export async function checkSupabase() {
  const [outlets, products] = await Promise.all([
    supabase.from('m_outlets').select('id').limit(1),
    supabase.from('m_products').select('id').limit(1),
  ])
  const error = outlets.error ?? products.error
  return error
    ? { ok: false, message: error.message }
    : { ok: true, message: 'm_outlets & m_products terbaca' }
}
