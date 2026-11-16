import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const missingEnvMessage =
  'Supabase env kosong: set NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY.'

// Tanpa fallback URL/key. Kalau env kosong (mis. prerender build tanpa env),
// modul tetap aman diimpor dan akses ke client melempar pesan yang jelas.
export const supabase: SupabaseClient =
  url && key
    ? createClient(url, key)
    : (new Proxy(
        {},
        {
          get() {
            throw new Error(missingEnvMessage)
          },
        }
      ) as SupabaseClient)

export async function checkSupabase() {
  try {
    const [outlets, products] = await Promise.all([
      supabase.from('m_outlets').select('id').limit(1),
      supabase.from('m_products').select('id').limit(1),
    ])
    const error = outlets.error ?? products.error
    return error
      ? { ok: false, message: error.message }
      : { ok: true, message: 'm_outlets & m_products terbaca' }
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) }
  }
}
