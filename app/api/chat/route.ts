import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';

// Gemini hanya menerjemahkan perintah jadi intent terstruktur.
// Tidak ada tulis database di sini: eksekusi tetap lewat kartu konfirmasi + RPC.
const commandSchema = z.object({
  intent: z.enum([
    'CREATE_DROP',
    'RECONCILE_BATCH',
    'SETTLE_PAYMENT',
    'RECORD_EXPENSE',
    'UNKNOWN',
  ]),
  outletId: z.string().nullable(),
  productId: z.string().nullable(),
  date: z.string().nullable(),
  qty: z.number().int().nullable(),
  qtyReturned: z.number().int().nullable(),
  amount: z.number().nullable(),
  paid: z.boolean().nullable(),
  settleAll: z.boolean().nullable(),
  category: z.string().nullable(),
  reason: z.string().nullable(),
});

const asList = (v: unknown) =>
  Array.isArray(v)
    ? v.slice(0, 50).map((x) => ({ id: String(x?.id ?? ''), name: String(x?.name ?? '') }))
    : [];

export async function POST(req: Request) {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return Response.json({ ok: false, error: 'AI belum dikonfigurasi.' }, { status: 503 });
  }

  const body = await req.json().catch(() => null);
  const text = typeof body?.text === 'string' ? body.text.slice(0, 500).trim() : '';
  if (!text) return Response.json({ ok: false }, { status: 400 });

  try {
    const { object } = await generateObject({
      model: google('gemini-2.5-flash'),
      schema: commandSchema,
      temperature: 0,
      system: `Kamu penerjemah perintah admin warung puding konsinyasi (bahasa Indonesia santai).
Hari ini: ${String(body?.today ?? '')} (zona WITA). Isi field sesuai skema; field tak relevan = null.
Aksi:
- CREATE_DROP: mencatat titipan baru. Butuh outletId + qty; productId bila varian disebut, null bila tidak.
- RECONCILE_BATCH: menghitung sisa/retur titipan. Butuh outletId + qtyReturned (boleh 0).
  paid=true HANYA bila perintah eksplisit menyebut lunas / sudah dibayar / udah bayar.
  date = tanggal titipan yang dimaksud bila disebut ("tanggal 16" -> tanggal 16 bulan berjalan).
- SETTLE_PAYMENT: melunasi piutang. outletId bila outlet disebut; settleAll=true HANYA bila menyebut "semua outlet" / "seluruh outlet".
- RECORD_EXPENSE: uang keluar atau belanja. Butuh amount dalam rupiah penuh ("120rb" = 120000).
  category salah satu: "Bahan Baku Utama", "Kemasan", "Operasional Lainnya".
- UNKNOWN: bukan perintah data. Isi reason singkat dalam bahasa Indonesia.
Aturan: outletId dan productId harus persis salah satu id dari daftar yang diberikan, jangan mengarang.
Jangan menebak nominal, jumlah, atau tanggal yang tidak disebut.`,
      prompt: `Daftar outlet: ${JSON.stringify(asList(body?.outlets))}
Daftar produk: ${JSON.stringify(asList(body?.products))}
Perintah admin: "${text}"`,
    });
    return Response.json({ ok: true, command: object });
  } catch {
    return Response.json({ ok: false }, { status: 502 });
  }
}
