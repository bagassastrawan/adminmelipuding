'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  LayoutDashboard,
  Store,
  Receipt,
  Sparkles,
  BarChart3,
  PlusCircle,
  RotateCcw,
  CheckCircle2,
  Pencil,
  Trash2,
  ShoppingBag,
  Wallet,
  Clock,
  TrendingUp,
  Send,
  Plus,
  Check,
  MessageCircle,
  X,
  Filter,
  ArrowDownLeft,
  ArrowUpRight,
  Package,
  MousePointerClick,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  ReferenceLine,
} from 'recharts';
import { supabase, checkSupabase } from '@/lib/supabase';

// ============================================================================
// HELPER FORMATTERS
// ============================================================================
const run = (q) =>
  q.then(({ error }) => error && console.error('Supabase:', error.message));

const formatIDR = (val) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(val || 0);

// Tanggal lokal. toISOString() memakai UTC, sehingga sebelum 08:00 WITA masih tanggal kemarin.
const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const nowTimeStr = () =>
  new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

// Tanggal eksplisit dari perintah chat ("tanggal 16" / "tgl 16"), di bulan berjalan.
const parseCmdDate = (str) => {
  const m = str.match(/\b(?:tanggal|tgl)\.?\s*(\d{1,2})\b/);
  if (!m) return null;
  const now = new Date();
  const d = new Date();
  d.setDate(+m[1]);
  if (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear()) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
};

const EXPENSE_COLORS = {
  'Bahan Baku Utama': '#5C3A21',
  Kemasan: '#9C7A5C',
  'Operasional Lainnya': '#CDB9A5',
};

export default function App() {
  // 5 Halaman Utama: 'dashboard' | 'reports' | 'transactions' | 'outlets-variants' | 'ai-validation'
  const [activeTab, setActiveTab] = useState('dashboard');

  // Status koneksi Supabase untuk indikator di UI.
  const [dbStatus, setDbStatus] = useState({
    state: 'checking',
    message: 'Memeriksa koneksi Supabase…',
  });


  // Master & Transaksi State (selalu dari Supabase)
  const [outlets, setOutlets] = useState([]);
  const [products, setProducts] = useState([]);
  const [batches, setBatches] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [aiLogs, setAiLogs] = useState([]);

  // Filter Halaman Riwayat Transaksi
  const [txFilter, setTxFilter] = useState('ALL'); // 'ALL' | 'CASH_IN' | 'UNPAID' | 'EXPENSE'
  const [txOutletFilter, setTxOutletFilter] = useState('ALL');

  // Floating WhatsApp-style AI Chat State
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([
    {
      id: 'm-1',
      sender: 'bot',
      text: 'Halo Admin Melpud! Ketik catatan titip puding, sisa retur, pelunasan, atau belanja bahan di sini.',
      time: '08:00',
    },
  ]);
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (chatOpen && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, chatOpen]);

  // Muat semua data dari Supabase + langganan realtime (semua tabel public).
  useEffect(() => {
    let alive = true;
    let healthy = false;
    let timer;

    const load = async () => {
      if (!healthy) {
        const check = await checkSupabase();
        if (!alive) return;
        setDbStatus({ state: check.ok ? 'ok' : 'error', message: check.message });
        if (!check.ok) return;
        healthy = true;
      }

      const [o, p, b, e, ai] = await Promise.all([
        supabase.from('outlets').select('*').order('name'),
        supabase.from('products').select('*').order('name'),
        supabase.from('consignment_batches').select('*').order('date', { ascending: false }),
        supabase.from('expenses').select('*').order('date', { ascending: false }),
        supabase.from('ai_logs').select('*').order('created_at', { ascending: false }),
      ]);
      if (!alive) return;
      [o, p, b, e, ai].forEach((r) => r.error && console.error('Supabase:', r.error.message));
      if (o.data) setOutlets(o.data.map((x) => ({ ...x, contact: x.contact ?? '-' })));
      if (p.data) setProducts(p.data);
      if (b.data) setBatches(b.data.map((x) => ({ ...x, qty_returned: x.qty_returned ?? null })));
      if (e.data) setExpenses(e.data);
      if (ai.data)
        setAiLogs(
          ai.data.map((x) => ({
            ...x,
            created_at: x.created_at ? new Date(x.created_at).toLocaleString('id-ID') : '',
          }))
        );
    };

    load();

    // Satu aksi tulis bisa memicu beberapa event realtime; tunda agar 1 reload.
    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(load, 400);
    };

    const channel = supabase
      .channel('melpud-live')
      .on('postgres_changes', { event: '*', schema: 'public' }, schedule)
      .subscribe();

    // HP sering mematikan websocket saat tab di latar; sinkronkan lagi begitu dibuka.
    const onVisible = () => {
      if (document.visibilityState === 'visible') load();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      alive = false;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
      supabase.removeChannel(channel);
    };
  }, []);


  // Modals State
  const [dropModal, setDropModal] = useState({ open: false, outletId: 'p-bungin' });
  const [dropForm, setDropForm] = useState({
    productId: 'pudding-coklat',
    qty: 10,
    date: todayStr(),
  });

  const [reconcileModal, setReconcileModal] = useState(null);
  const [reconcileForm, setReconcileForm] = useState({ qtyReturned: 0, paidNow: false });

  const [editBatchModal, setEditBatchModal] = useState(null);
  const [editBatchForm, setEditBatchForm] = useState({ qty_drop: 10, qty_returned: 0 });

  const [expenseModal, setExpenseModal] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    category: 'Bahan Baku Utama',
    description: '',
    amount: '',
    date: todayStr(),
  });

  const [editExpenseModal, setEditExpenseModal] = useState(null);
  const [editExpenseForm, setEditExpenseForm] = useState({
    category: 'Bahan Baku Utama',
    description: '',
    amount: 0,
  });

  // Outlet & Variant Modals
  const [outletModal, setOutletModal] = useState(null); // null | { id?, name, contact }

  const [variantModal, setVariantModal] = useState(false);
  const [variantForm, setVariantForm] = useState({ id: null, name: '', price: '5000' });

  const [deleteDialog, setDeleteDialog] = useState(null);
  const [selectedIntents, setSelectedIntents] = useState({});

  // ============================================================================
  // COMPUTED BATCHES & FINANCIAL SUMMARY
  // ============================================================================
  const enrichedBatches = useMemo(() => {
    return batches.map((b) => {
      const qty_sold =
        b.status === 'RECONCILED' ? Math.max(0, b.qty_drop - (b.qty_returned ?? 0)) : 0;
      const total_bill = b.status === 'RECONCILED' ? qty_sold * b.price_unit : 0;
      const outletObj = outlets.find((o) => o.id === b.outlet_id);
      return {
        ...b,
        qty_sold,
        total_bill,
        product_name:
          b.product_name ||
          products.find((p) => p.id === b.product_id)?.name ||
          'Varian',
        outlet_name: outletObj ? outletObj.name : b.outlet_id,
      };
    });
  }, [batches, outlets, products]);

  const financials = useMemo(() => {
    const unpaidReceivables = enrichedBatches
      .filter((b) => b.status === 'RECONCILED' && b.payment_status === 'UNPAID')
      .reduce((sum, b) => sum + b.total_bill, 0);

    const realCashIn = enrichedBatches
      .filter((b) => b.status === 'RECONCILED' && b.payment_status === 'PAID')
      .reduce((sum, b) => sum + b.total_bill, 0);

    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const netCash = realCashIn - totalExpenses;
    const projectedProfit = realCashIn + unpaidReceivables - totalExpenses;

    return {
      unpaidReceivables,
      realCashIn,
      totalExpenses,
      netCash,
      projectedProfit,
    };
  }, [enrichedBatches, expenses]);

  const pendingAiLogs = useMemo(
    () => aiLogs.filter((l) => l.status === 'PENDING'),
    [aiLogs]
  );
  const learnedAiLogs = useMemo(
    () => aiLogs.filter((l) => l.status === 'LEARNED'),
    [aiLogs]
  );

  // ============================================================================
  // WHATSAPP-STYLE AI AGENT: PARSE -> KARTU KONFIRMASI -> EKSEKUSI VIA RPC
  // ============================================================================
  // Parser HANYA memetakan perintah menjadi aksi yang diizinkan
  // (CREATE_DROP, RECONCILE_BATCH, SETTLE_PAYMENT, RECORD_EXPENSE).
  // Tidak ada satu pun tulis data di sini: database baru disentuh setelah
  // admin menekan "Konfirmasi & Jalankan" pada kartu konfirmasi di chat.
  // cmd = hasil terjemahan Gemini ({intent, outletId, ...}). Bila null/gagal,
  // seluruh fungsi jatuh ke pembacaan kata kunci seperti sebelumnya.
  const parseAiCommand = (rawText, cmd = null) => {
    const text = rawText.toLowerCase().trim();
    const aiDate = cmd?.date || null;

    const matchedOutlet = cmd?.outletId
      ? outlets.find((o) => o.id === cmd.outletId)
      : outlets.find((o) => {
          const cleanName = o.name.toLowerCase().replace(/\./g, '').trim();
          const shortName = cleanName.replace(/^p\s+/, '');
          return text.includes(cleanName) || text.includes(shortName);
        });

    
    const normalizeProductName = (value) =>
      String(value ?? '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\bpudding\b/g, 'puding')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();

    const normalizedInput = normalizeProductName(rawText);

    // Cari nama produk yang benar-benar disebut pengguna.
    // Nama terpanjang diprioritaskan agar varian tidak tertukar.
    const matchedProduct =
      products
        .filter((p) => {
          const productName = normalizeProductName(p.name);
          return productName && normalizedInput.includes(productName);
        })
        .sort(
          (a, b) =>
            normalizeProductName(b.name).length -
            normalizeProductName(a.name).length
        )[0] ||
      (cmd?.productId
        ? products.find((p) => p.id === cmd.productId)
        : null) ||
      products[0];


    const parseNominal = (str) => {
      const rbMatch = str.match(/(\d+(?:[.,]\d+)?)\s*(rb|ribu|k)\b/i);
      if (rbMatch) {
        return Math.round(parseFloat(rbMatch[1].replace(',', '.')) * 1000);
      }
      const rawNum = str.match(/\b(\d{4,7})\b/);
      if (rawNum) return parseInt(rawNum[1], 10);
      return null;
    };

    const customLearned = learnedAiLogs.find((l) => {
      const keyWord = l.raw_text.split(' ')[0]?.toLowerCase();
      return keyWord && text.includes(keyWord);
    });

    // Perintah ambigu/tidak lengkap: DILARANG menyentuh tabel operasional.
    // Cukup dicatat ke ai_logs berstatus PENDING lalu minta klarifikasi.
    const refuse = (intent, reason, hint) => {
      const newLog = {
        id: `ai-${Date.now()}`,
        raw_text: rawText,
        ai_reason: `${reason} Menunggu klarifikasi admin.`,
        status: 'PENDING',
        mapped_intent: intent,
        created_at: new Date().toLocaleString('id-ID'),
      };
      setAiLogs((prev) => [newLog, ...prev]);
      run(
        supabase.from('ai_logs').insert({
          id: newLog.id,
          raw_text: newLog.raw_text,
          ai_reason: newLog.ai_reason,
          status: newLog.status,
          mapped_intent: newLog.mapped_intent,
        })
      );
      return {
        type: 'pending',
        reply: `Belum ada data yang diubah. ${reason} ${hint}`,
      };
    };

    if (cmd?.intent === 'UNKNOWN') {
      return refuse(
        null,
        cmd.reason || 'Perintahnya belum saya kenali.',
        'Coba ulangi dengan kata kunci yang lebih jelas, misal: "titip 10 cup ke P. BUNGIN", "sisa 2 cup P. BUNGIN", atau "belanja bahan 120rb".'
      );
    }

    // 1. EXPENSE (Uang Keluar Belanja Bahan) -> kartu konfirmasi
    if (
      cmd
        ? cmd.intent === 'RECORD_EXPENSE'
        : text.includes('belanja') ||
          text.includes('beli') ||
          text.includes('bensin') ||
          (customLearned && customLearned.mapped_intent === 'RECORD_EXPENSE')
    ) {
      const amount = cmd?.amount ?? parseNominal(text);
      if (!amount) {
        return refuse(
          'RECORD_EXPENSE',
          'Nominal belanjanya tidak saya tangkap.',
          'Contoh: "belanja bahan 120rb".'
        );
      }
      let category = 'Bahan Baku Utama';
      if (
        text.includes('cup') ||
        text.includes('sendok') ||
        text.includes('plastik') ||
        text.includes('stiker')
      ) {
        category = 'Kemasan';
      } else if (
        text.includes('bensin') ||
        text.includes('gas') ||
        text.includes('operasional')
      ) {
        category = 'Operasional Lainnya';
      }
      if (cmd?.category && EXPENSE_COLORS[cmd.category]) category = cmd.category;

      const expenseDate = aiDate || parseCmdDate(text) || todayStr();

      return {
        type: 'confirm',
        action: 'RECORD_EXPENSE',
        payload: { date: expenseDate, category, description: rawText, amount },
        intro: 'Saya siap catat uang keluar. Periksa detailnya lalu tekan tombol di bawah:',
        summary: [
          ['Kategori', category],
          ['Uraian', rawText],
          ['Nominal', formatIDR(amount)],
          ['Tanggal', expenseDate],
          ['Aksi', 'RECORD_EXPENSE'],
        ],
      };
    }

    // 2. RECONCILE / SISA CUP -> kartu konfirmasi.
    //    Rekonsiliasi TIDAK PERNAH menyetel pembayaran ke PAID kecuali
    //    perintah eksplisit menyebut "lunas/sudah dibayar".
    if (
      cmd ? cmd.intent === 'RECONCILE_BATCH' : text.includes('sisa') || text.includes('retur')
    ) {
      if (!matchedOutlet) {
        return refuse(
          'RECONCILE_BATCH',
          'Nama outletnya tidak jelas.',
          'Sebutkan outletnya, misal: "sisa 2 cup P. BUNGIN".'
        );
      }
      const sisaMatch =
        text.match(/(?:sisa|retur)\s*(\d+)/i) || text.match(/(\d+)\s*cup/i);
      const qtyReturned = cmd?.qtyReturned ?? (sisaMatch ? parseInt(sisaMatch[1], 10) : null);
      if (qtyReturned == null) {
        return refuse(
          'RECONCILE_BATCH',
          'Jumlah sisa/returnya tidak disebutkan.',
          'Sebutkan jumlahnya, misal: "sisa 2 cup P. BUNGIN".'
        );
      }
      const isPaid = cmd
        ? !!cmd.paid
        : (text.includes('sudah dibayar') ||
            text.includes('udah bayar') ||
            text.includes('lunas')) &&
          !text.includes('belum') &&
          !text.includes('belom');

      // Pilih batch sesuai tanggal yang diminta; tanpa tanggal tetap ACTIVE pertama.
      const wantedDate = aiDate || parseCmdDate(text);
      const targetBatch = batches.find(
        (b) =>
          b.outlet_id === matchedOutlet.id &&
          b.status === 'ACTIVE' &&
          (!wantedDate || b.date === wantedDate)
      );

      if (!targetBatch) {
        return {
          type: 'reply',
          reply: `Saat ini tidak ada stok berstatus ACTIVE di ${matchedOutlet.name}${
            wantedDate ? ` pada tanggal ${wantedDate}` : ''
          } untuk dihitung sisanya. Tidak ada data yang diubah.`,
        };
      }

      const safeRet = Math.min(targetBatch.qty_drop, Math.max(0, qtyReturned));
      const sold = targetBatch.qty_drop - safeRet;
      const bill = sold * targetBatch.price_unit;

      return {
        type: 'confirm',
        action: 'RECONCILE_BATCH',
        payload: {
          batchId: targetBatch.id,
          outletId: matchedOutlet.id,
          qtyReturned: safeRet,
          paymentStatus: isPaid ? 'PAID' : 'UNPAID',
        },
        intro: 'Saya siap rekonsiliasi titipan ini. Periksa detailnya lalu tekan tombol di bawah:',
        summary: [
          ['Outlet', matchedOutlet.name],
          ['Tanggal titip', targetBatch.date],
          ['Qty drop', `${targetBatch.qty_drop} cup`],
          ['Qty retur', `${safeRet} cup`],
          ['Laku', `${sold} cup = ${formatIDR(bill)}`],
          [
            'Status bayar',
            isPaid ? 'PAID (lunas, sesuai perintah)' : 'UNPAID (menumpuk jadi piutang)',
          ],
          ['Aksi', 'RECONCILE_BATCH'],
        ],
      };
    }

    // 3. PELUNASAN (SETTLE PAYMENT) -> kartu konfirmasi.
    //    Hanya baris RECONCILED + UNPAID milik outlet yang disebut
    //    (atau 'ALL' bila eksplisit "bayar semua outlet") yang disentuh.
    const wantsSettle = cmd
      ? cmd.intent === 'SETTLE_PAYMENT'
      : (text.includes('lunas') ||
          text.includes('sudah dibayar') ||
          text.includes('udah bayar') ||
          text.includes('bayar semua') ||
          text.includes('pelunasan')) &&
        !text.includes('belum') &&
        !text.includes('belom');
    if (wantsSettle) {
      let scope = null;
      if (cmd) scope = cmd.settleAll ? 'ALL' : matchedOutlet?.id ?? null;
      else if (matchedOutlet) scope = matchedOutlet.id;
      else if (/semua outlet|seluruh outlet/.test(text)) scope = 'ALL';
      if (!scope) {
        return refuse(
          'SETTLE_PAYMENT',
          'Outlet yang mau dilunasi tidak jelas.',
          'Sebutkan outletnya, atau tulis "bayar semua outlet" untuk melunasi semuanya.'
        );
      }

      const unpaid = enrichedBatches.filter(
        (b) =>
          b.status === 'RECONCILED' &&
          b.payment_status === 'UNPAID' &&
          (scope === 'ALL' || b.outlet_id === scope)
      );
      if (unpaid.length === 0) {
        return {
          type: 'reply',
          reply: `Semua tagihan ${
            scope === 'ALL' ? 'seluruh outlet' : `di ${matchedOutlet.name}`
          } sudah berstatus PAID (Lunas). Tidak ada data yang diubah.`,
        };
      }
      const totalSettled = unpaid.reduce((s, b) => s + b.total_bill, 0);

      return {
        type: 'confirm',
        action: 'SETTLE_PAYMENT',
        payload: { outletId: scope },
        intro: 'Saya siap melunasi tagihan berikut. Periksa detailnya lalu tekan tombol di bawah:',
        summary: [
          ['Outlet', scope === 'ALL' ? 'SEMUA OUTLET' : matchedOutlet.name],
          ['Jumlah batch', `${unpaid.length} batch RECONCILED + UNPAID`],
          ['Total tagihan', formatIDR(totalSettled)],
          ['Efek', 'Berpindah dari piutang ke kas riil (PAID)'],
          ['Aksi', 'SETTLE_PAYMENT'],
        ],
      };
    }

    // 4. CREATE DROP (TITIP PUDDING) -> kartu konfirmasi
    if (
      cmd
        ? cmd.intent === 'CREATE_DROP'
        : text.includes('taruh') ||
          text.includes('titip') ||
          text.includes('naruh') ||
          text.includes('masukkan') ||
          (customLearned && customLearned.mapped_intent === 'CREATE_DROP')
    ) {
      if (!matchedOutlet) {
        return refuse(
          'CREATE_DROP',
          'Outlet tujuannya tidak jelas.',
          'Sebutkan outletnya, misal: "titip 10 cup ke P. BUNGIN".'
        );
      }
      const qtyMatch = text.match(/\b(\d{1,4})\b/);
      const qty = cmd?.qty ?? (qtyMatch ? parseInt(qtyMatch[1], 10) : null);
      if (!qty) {
        return refuse(
          'CREATE_DROP',
          'Jumlah cup yang dititip tidak disebutkan.',
          'Sebutkan jumlahnya, misal: "titip 10 cup ke P. BUNGIN".'
        );
      }
      if (!matchedProduct) {
        return refuse(
          'CREATE_DROP',
          'Belum ada varian pudding di master.',
          'Tambahkan varian dulu di tab Master outlet & varian.'
        );
      }
      const dropDate = aiDate || parseCmdDate(text) || todayStr();

      return {
        type: 'confirm',
        action: 'CREATE_DROP',
        payload: {
          date: dropDate,
          outletId: matchedOutlet.id,
          productId: matchedProduct.id,
          productName: matchedProduct.name,
          product_name: matchedProduct.name,
          qty,
          qtyDrop: qty,
          qty_drop: qty,
          priceUnit: matchedProduct.price,
        },
        intro: 'Saya siap mencatat titipan baru. Periksa detailnya lalu tekan tombol di bawah:',
        summary: [
          ['Outlet', matchedOutlet.name],
          ['Tanggal', dropDate],
          ['Varian', matchedProduct.name],
          ['Qty drop', `${qty} cup`],
          ['Harga/cup', formatIDR(matchedProduct.price)],
          ['Total potensi', formatIDR(qty * matchedProduct.price)],
          ['Aksi', 'CREATE_DROP'],
        ],
      };
    }

    // 5. PERINTAH TIDAK DIKENALI / AMBIGU -> tolak, catat PENDING, minta klarifikasi
    return refuse(
      null,
      'Perintahnya belum saya kenali.',
      'Coba ulangi dengan kata kunci yang lebih jelas, misal: "titip 10 cup ke P. BUNGIN", "sisa 2 cup P. BUNGIN", "bayar semua outlet P. BUNGIN", atau "belanja bahan 120rb".'
    );
  };

  // Minta Gemini (server) menerjemahkan perintah. null = pakai parser kata kunci.
  const askGemini = async (text) => {
    try {
      const r = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          today: todayStr(),
          outlets: outlets.map((o) => ({ id: o.id, name: o.name })),
          products: products.map((p) => ({ id: p.id, name: p.name })),
        }),
        signal: AbortSignal.timeout(8000),
      });
      if (!r.ok) return null;
      const json = await r.json();
      return json?.ok ? json.command : null;
    } catch {
      return null;
    }
  };

  const handleSendChat = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const text = chatInput.trim();
    const userMsg = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text,
      time: nowTimeStr(),
    };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput('');

    const res = parseAiCommand(text, await askGemini(text));
    if (res.type === 'confirm') {
      if (!learnedAiLogs.some((l) => l.raw_text.toLowerCase() === text.toLowerCase())) {
        const newLog = {
          id: `ai-${Date.now()}`,
          raw_text: text,
          ai_reason: 'Perintah dikenali otomatis.',
          status: 'LEARNED',
          mapped_intent: res.action,
          created_at: new Date().toLocaleString('id-ID'),
        };
        setAiLogs((prev) => [newLog, ...prev]);
        run(
          supabase.from('ai_logs').insert({
            id: newLog.id,
            raw_text: newLog.raw_text,
            ai_reason: newLog.ai_reason,
            status: newLog.status,
            mapped_intent: newLog.mapped_intent,
          })
        );
      }
      setChatMessages((prev) => [
        ...prev,
        {
          id: `b-${Date.now() + 1}`,
          sender: 'bot',
          text: res.intro,
          time: nowTimeStr(),
          confirm: { action: res.action, payload: res.payload, summary: res.summary },
          confirmState: 'idle',
        },
      ]);
    } else {
      setChatMessages((prev) => [
        ...prev,
        {
          id: `b-${Date.now() + 1}`,
          sender: 'bot',
          text: res.reply,
          isLearning: res.type === 'pending',
          time: nowTimeStr(),
        },
      ]);
    }
  };

  // ============================================================================
  // EKSEKUSI AI: HANYA DIPANGGIL DARI TOMBOL KARTU KONFIRMASI DI CHAT
  // ============================================================================
  const setConfirmState = (msgId, state) =>
    setChatMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, confirmState: state } : m))
    );

  const appendBot = (text) =>
    setChatMessages((prev) => [
      ...prev,
      {
        id: `b-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        sender: 'bot',
        text,
        time: nowTimeStr(),
      },
    ]);

  // Segarkan tabel terkait dari Supabase setelah RPC sukses (sumber kebenaran
  // tetap database; realtime akan menyusul bila migration 002 sudah jalan).
  const refreshAfterAction = async (action) => {
    if (action === 'RECORD_EXPENSE') {
      const { data } = await supabase
        .from('expenses')
        .select('*')
        .order('date', { ascending: false });
      if (data) setExpenses(data);
    } else {
      const { data } = await supabase
        .from('consignment_batches')
        .select('*')
        .order('date', { ascending: false });
      if (data) setBatches(data.map((x) => ({ ...x, qty_returned: x.qty_returned ?? null })));
    }
  };

  const confirmedReply = (action, payload, count) => {
    if (count === 0) {
      return `Tidak ada baris yang cocok, tidak ada data yang diubah (${action}).`;
    }
    if (action === 'CREATE_DROP') {
      const o = outlets.find((x) => x.id === payload.outletId);
      const p = products.find((x) => x.id === payload.productId);
      return `Berhasil mencatat titipan ${payload.qty} cup ${p?.name ?? ''} di outlet ${
        o?.name ?? payload.outletId
      } pada tanggal ${payload.date}.`;
    }
    if (action === 'RECONCILE_BATCH') {
      const o = outlets.find((x) => x.id === payload.outletId);
      return `Rekonsiliasi ${o?.name ?? payload.outletId} selesai: sisa ${payload.qtyReturned} cup. Status: ${
        payload.paymentStatus === 'PAID'
          ? 'PAID (Lunas)'
          : 'UNPAID (menumpuk jadi piutang)'
      }.`;
    }
    if (action === 'SETTLE_PAYMENT') {
      const scope =
        payload.outletId === 'ALL'
          ? 'semua outlet'
          : outlets.find((x) => x.id === payload.outletId)?.name ?? payload.outletId;
      return `${count} batch lunas (PAID) di ${scope} — nilainya berpindah dari piutang ke kas riil.`;
    }
    if (action === 'RECORD_EXPENSE') {
      return `Berhasil dicatat ke Uang Keluar (${payload.category}): "${payload.description}" sebesar ${formatIDR(
        payload.amount
      )} tanggal ${payload.date}. Saldo kas otomatis dipotong.`;
    }
    return `Aksi ${action} selesai (${count} baris).`;
  };

  const handleConfirmAiAction = async (msgId) => {
    const msg = chatMessages.find((m) => m.id === msgId);
    if (!msg || !msg.confirm || msg.confirmState !== 'idle') return;
    const { action, payload } = msg.confirm;
    setConfirmState(msgId, 'running');

    const { data, error } =
      action === 'RECONCILE_BATCH'
        ? await supabase
            .from('consignment_batches')
            .update({
              qty_returned: payload.qtyReturned,
              status: 'RECONCILED',
              payment_status: payload.paymentStatus,
            })
            .eq('id', payload.batchId)
            .select('id')
        : await supabase.rpc('execute_melpud_action', {
            p_action: action,
            p_payload: payload,
          });
    if (error || data?.ok === false) {
      const why = error?.message || data?.error || 'Aksi ditolak oleh database.';
      appendBot(`Gagal menjalankan ${action}: ${why}`);
      setConfirmState(msgId, 'idle');
      return;
    }
    await refreshAfterAction(action);
    setConfirmState(msgId, 'done');
    appendBot(
      confirmedReply(
        action,
        payload,
        Array.isArray(data) ? data.length : data?.count ?? data?.affected ?? 0
      )
    );
  };

  const handleCancelAiAction = (msgId) => {
    setConfirmState(msgId, 'cancelled');
    appendBot('Dibatalkan. Tidak ada data yang diubah.');
  };

  // ============================================================================
  // CRUD HANDLERS
  // ============================================================================
  const handleCreateDrop = (e) => {
    e.preventDefault();
    const prod = products.find((p) => p.id === dropForm.productId) || products[0];
    const newBatch = {
      id: `b-${Date.now()}`,
      date: dropForm.date || todayStr(),
      outlet_id: dropModal.outletId,
      product_id: prod.id,
      product_name: prod.name,
      qty_drop: Math.max(1, Number(dropForm.qty)),
      qty_returned: null,
      price_unit: prod.price,
      status: 'ACTIVE',
      payment_status: 'UNPAID',
      paid_at: null,
    };
    setBatches((prev) => [newBatch, ...prev]);
    run(supabase.from('consignment_batches').insert({ ...newBatch, qty_returned: 0 }));
    setDropModal({ open: false, outletId: 'p-bungin' });
  };

  const handleReconcileSave = (e) => {
    e.preventDefault();
    if (!reconcileModal) return;
    const safeRet = Math.min(
      reconcileModal.qty_drop,
      Math.max(0, Number(reconcileForm.qtyReturned))
    );
    setBatches((prev) =>
      prev.map((b) =>
        b.id === reconcileModal.id
          ? {
              ...b,
              qty_returned: safeRet,
              status: 'RECONCILED',
              payment_status: reconcileForm.paidNow ? 'PAID' : 'UNPAID',
              paid_at: reconcileForm.paidNow ? todayStr() : null,
            }
          : b
      )
    );
    run(
      supabase
        .from('consignment_batches')
        .update({
          qty_returned: safeRet,
          status: 'RECONCILED',
          payment_status: reconcileForm.paidNow ? 'PAID' : 'UNPAID',
          paid_at: reconcileForm.paidNow ? todayStr() : null,
        })
        .eq('id', reconcileModal.id)
    );
    setReconcileModal(null);
  };

  const handleTogglePaymentStatus = (batch) => {
    const nextStatus = batch.payment_status === 'PAID' ? 'UNPAID' : 'PAID';
    setBatches((prev) =>
      prev.map((b) =>
        b.id === batch.id
          ? {
              ...b,
              payment_status: nextStatus,
              paid_at: nextStatus === 'PAID' ? todayStr() : null,
            }
          : b
      )
    );
    run(
      supabase
        .from('consignment_batches')
        .update({
          payment_status: nextStatus,
          paid_at: nextStatus === 'PAID' ? todayStr() : null,
        })
        .eq('id', batch.id)
    );
  };

  // Bayar Semua: outletId tunggal, atau 'ALL' untuk seluruh outlet.
  // Hanya baris RECONCILED + UNPAID yang disentuh; batch PAID tidak diubah.
  const handleSettleAllOutlet = async (outletId) => {
    const today = todayStr();
    const match = (b) =>
      b.status === 'RECONCILED' &&
      b.payment_status === 'UNPAID' &&
      (outletId === 'ALL' || b.outlet_id === outletId);
    setBatches((prev) =>
      prev.map((b) => (match(b) ? { ...b, payment_status: 'PAID', paid_at: today } : b))
    );
    let q = supabase
      .from('consignment_batches')
      .update({ payment_status: 'PAID', paid_at: today })
      .eq('status', 'RECONCILED')
      .eq('payment_status', 'UNPAID');
    if (outletId !== 'ALL') q = q.eq('outlet_id', outletId);
    const { error } = await q;
    if (error) {
      // Jangan biarkan UI menampilkan lunas padahal database menolak.
      alert(`Gagal menyimpan pelunasan: ${error.message}`);
      await refreshAfterAction('SETTLE_PAYMENT');
    }
  };

  const handleEditBatchSave = (e) => {
    e.preventDefault();
    if (!editBatchModal) return;
    const newDrop = Math.max(1, Number(editBatchForm.qty_drop));
    const newRet =
      editBatchModal.status === 'RECONCILED'
        ? Math.min(newDrop, Math.max(0, Number(editBatchForm.qty_returned)))
        : null;

    setBatches((prev) =>
      prev.map((b) =>
        b.id === editBatchModal.id
          ? { ...b, qty_drop: newDrop, qty_returned: newRet }
          : b
      )
    );
    run(
      supabase
        .from('consignment_batches')
        .update({ qty_drop: newDrop, qty_returned: newRet ?? 0 })
        .eq('id', editBatchModal.id)
    );
    setEditBatchModal(null);
  };

  const handleCreateExpense = (e) => {
    e.preventDefault();
    const newExp = {
      id: `e-${Date.now()}`,
      date: expenseForm.date || todayStr(),
      category: expenseForm.category,
      description: expenseForm.description,
      amount: Math.max(100, Number(expenseForm.amount)),
    };
    setExpenses((prev) => [newExp, ...prev]);
    run(supabase.from('expenses').insert(newExp));
    setExpenseForm({
      category: 'Bahan Baku Utama',
      description: '',
      amount: '',
      date: todayStr(),
    });
    setExpenseModal(false);
  };

  const handleEditExpenseSave = (e) => {
    e.preventDefault();
    if (!editExpenseModal) return;
    setExpenses((prev) =>
      prev.map((item) =>
        item.id === editExpenseModal.id
          ? {
              ...item,
              category: editExpenseForm.category,
              description: editExpenseForm.description,
              amount: Math.max(100, Number(editExpenseForm.amount)),
            }
          : item
      )
    );
    run(
      supabase
        .from('expenses')
        .update({
          category: editExpenseForm.category,
          description: editExpenseForm.description,
          amount: Math.max(100, Number(editExpenseForm.amount)),
        })
        .eq('id', editExpenseModal.id)
    );
    setEditExpenseModal(null);
  };

  const handleSaveOutlet = (e) => {
    e.preventDefault();
    if (!outletModal || !outletModal.name.trim()) return;
    const name = outletModal.name.toUpperCase().trim();
    const contact = outletModal.contact || null;

    if (outletModal.id) {
      setOutlets((prev) =>
        prev.map((o) => (o.id === outletModal.id ? { ...o, name, contact: contact ?? '-' } : o))
      );
      run(supabase.from('outlets').update({ name, contact }).eq('id', outletModal.id));
    } else {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const newId = `${slug}-${Date.now()}`;
      setOutlets((prev) => [...prev, { id: newId, name, contact: contact ?? '-', active: true }]);
      run(supabase.from('outlets').insert({ id: newId, name, contact, active: true }));
    }
    setOutletModal(null);
  };

  const handleSaveVariant = (e) => {
    e.preventDefault();
    if (!variantForm.name.trim()) return;
    if (variantForm.id) {
      // Edit existing variant
      setProducts((prev) =>
        prev.map((p) =>
          p.id === variantForm.id
            ? { ...p, name: variantForm.name.trim(), price: Math.max(500, Number(variantForm.price)) }
            : p
        )
      );
      run(
        supabase
          .from('products')
          .update({
            name: variantForm.name.trim(),
            price: Math.max(500, Number(variantForm.price)),
          })
          .eq('id', variantForm.id)
      );
    } else {
      // Create new variant
      const slug = variantForm.name.toLowerCase().replace(/\s+/g, '-');
      const newId = `${slug}-${Date.now()}`;
      setProducts((prev) => [
        ...prev,
        {
          id: newId,
          name: variantForm.name.trim(),
          price: Math.max(500, Number(variantForm.price)),
        },
      ]);
      run(
        supabase.from('products').insert({
          id: newId,
          name: variantForm.name.trim(),
          price: Math.max(500, Number(variantForm.price)),
        })
      );
    }
    setVariantForm({ id: null, name: '', price: '5000' });
    setVariantModal(false);
  };

  const confirmDeleteAction = () => {
    if (!deleteDialog) return;
    const { type, id } = deleteDialog;
    const table = {
      batch: 'consignment_batches',
      expense: 'expenses',
      ai: 'ai_logs',
      product: 'products',
      outlet: 'outlets',
    }[type];
    const onDone = {
      batch: () => setBatches((prev) => prev.filter((x) => x.id !== id)),
      expense: () => setExpenses((prev) => prev.filter((x) => x.id !== id)),
      ai: () => setAiLogs((prev) => prev.filter((x) => x.id !== id)),
      product: () => setProducts((prev) => prev.filter((x) => x.id !== id)),
      outlet: () => setOutlets((prev) => prev.filter((x) => x.id !== id)),
    }[type];

    setDeleteDialog(null);
    supabase
      .from(table)
      .delete()
      .eq('id', id)
      .then(({ error }) => {
        if (error) {
          console.error('Supabase:', error.message);
          alert(`Gagal menghapus: ${error.message}`);
          return;
        }
        onDone();
      });
  };

  const handleValidateAiLog = (id) => {
    const chosenIntent = selectedIntents[id] || 'CREATE_DROP';
    const ai_reason = `Telah divalidasi & dipelajari sebagai ${chosenIntent}`;
    setAiLogs((prev) =>
      prev.map((l) =>
        l.id === id ? { ...l, status: 'LEARNED', mapped_intent: chosenIntent, ai_reason } : l
      )
    );
    run(
      supabase
        .from('ai_logs')
        .update({ status: 'LEARNED', mapped_intent: chosenIntent, ai_reason })
        .eq('id', id)
    );
  };

  // ============================================================================
  // CHARTS & COMBINED TRANSACTIONS LEDGER
  // ============================================================================
  const barChartData = [
    { name: 'Uang masuk', nominal: financials.realCashIn, fill: '#141414' },
    { name: 'Piutang', nominal: financials.unpaidReceivables, fill: '#8A8A8A' },
    { name: 'Belanja bahan', nominal: financials.totalExpenses, fill: '#8A8A8A' },
    {
      name: 'Kas bersih',
      nominal: financials.netCash,
      fill: financials.netCash < 0 ? '#C4242A' : '#5C3A21',
    },
  ];

  const pieChartData = useMemo(() => {
    const grouped = expenses.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + item.amount;
      return acc;
    }, {});
    return Object.entries(grouped).map(([name, value]) => ({
      name,
      value,
      color: EXPENSE_COLORS[name] || '#141414',
    }));
  }, [expenses]);

  // Unified Transaction List (Uang Masuk, Piutang, Uang Keluar)
  const unifiedTransactions = useMemo(() => {
    const batchItems = enrichedBatches.map((b) => ({
      id: b.id,
      txType: 'CONSIGNMENT',
      date: b.date,
      title: `${b.outlet_name} — ${b.product_name}`,
      subtitle:
        b.status === 'ACTIVE'
          ? `Titip ${b.qty_drop} cup (Masih Aktif di Outlet)`
          : `Titip ${b.qty_drop} • Sisa ${b.qty_returned} • Terjual ${b.qty_sold} cup`,
      amount: b.total_bill,
      status: b.status === 'ACTIVE' ? 'ACTIVE' : b.payment_status, // ACTIVE | PAID | UNPAID
      outlet_id: b.outlet_id,
      raw: b,
    }));

    const expenseItems = expenses.map((e) => ({
      id: e.id,
      txType: 'EXPENSE',
      date: e.date,
      title: e.description,
      subtitle: `Kategori: ${e.category} (Potong Kas Penjualan)`,
      amount: e.amount,
      status: 'EXPENSE',
      outlet_id: null,
      raw: e,
    }));

    return [...batchItems, ...expenseItems].sort((a, b) => b.date.localeCompare(a.date));
  }, [enrichedBatches, expenses]);

  const filteredTransactions = useMemo(() => {
    return unifiedTransactions.filter((item) => {
      if (txOutletFilter !== 'ALL' && item.outlet_id !== txOutletFilter) {
        return false;
      }
      if (txFilter === 'CASH_IN') return item.txType === 'CONSIGNMENT' && item.status === 'PAID';
      if (txFilter === 'UNPAID')
        return item.txType === 'CONSIGNMENT' && (item.status === 'UNPAID' || item.status === 'ACTIVE');
      if (txFilter === 'EXPENSE') return item.txType === 'EXPENSE';
      return true;
    });
  }, [unifiedTransactions, txFilter, txOutletFilter]);

  return (
    <div className="min-h-screen bg-[#F4F3F0] text-[#141414] flex flex-col md:flex-row font-sans">
      {/* =====================================================================
          SIDEBAR NAVIGASI (COKLAT PUDDING, PUTIH, HITAM & WARNA PRIMER)
      ===================================================================== */}
      <aside className="w-full md:w-56 bg-[#F4F3F0] md:border-r border-b md:border-b-0 border-[#E6E5E2] px-4 md:px-3 py-4 md:py-5 flex flex-col shrink-0">
        <div>
          {/* Brand */}
          <div className="flex items-center gap-2.5 px-2 mb-6">
            <div className="w-8 h-8 rounded-md bg-[#5C3A21] text-white flex items-center justify-center text-sm font-medium">
              M
            </div>
            <div>
              <p className="text-sm font-medium leading-tight text-[#141414]">Melpud</p>
              <p className="text-xs leading-tight text-[#6B6B6B]">Consignment &amp; cash</p>
            </div>
          </div>

          {/* Main navigation */}
          <nav className="flex md:flex-col gap-0.5 overflow-x-auto pb-1 md:pb-0">
            {[
              { id: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard },
              { id: 'reports', label: 'Laporan & grafik', Icon: BarChart3 },
              { id: 'transactions', label: 'Riwayat transaksi', Icon: Receipt },
              { id: 'outlets-variants', label: 'Master outlet & varian', Icon: Store },
              { id: 'ai-validation', label: 'Validasi AI', Icon: Sparkles },
            ].map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2.5 h-9 px-3 rounded-md text-sm transition-colors whitespace-nowrap ${
                  activeTab === id
                    ? 'bg-[#E9E8E5] text-[#141414] font-medium'
                    : 'text-[#5F5F5F] hover:bg-[#EDECEA]'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="flex-1 text-left">{label}</span>
                {id === 'ai-validation' && pendingAiLogs.length > 0 && (
                  <span className="text-xs font-medium text-[#92400E] bg-[#FFFBEB] border border-[#FDE68A] rounded-full px-1.5">
                    {pendingAiLogs.length}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </aside>

      {/* =====================================================================
          MAIN CONTENT AREA
      ===================================================================== */}
      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 w-full max-w-6xl space-y-6 pb-24">
        {/* Indikator koneksi Supabase (terlihat di semua tab) */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#6B6B6B]">
          <span
            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
              dbStatus.state === 'ok'
                ? 'bg-[#2E7D32]'
                : dbStatus.state === 'error'
                ? 'bg-[#C4242A]'
                : 'bg-[#D4D3CF]'
            }`}
          />
          <span className="font-medium text-[#141414]">
            {dbStatus.state === 'ok'
              ? 'Supabase terhubung'
              : dbStatus.state === 'error'
              ? 'Supabase gagal terhubung'
              : 'Memeriksa koneksi Supabase…'}
          </span>
          {dbStatus.state !== 'checking' && <span>— {dbStatus.message}</span>}
        </div>

        {/* ===================================================================
            HALAMAN 1: DASHBOARD UTAMA (METRIK KAS & 5 KARTU OUTLET INTERAKTIF)
            (Tanpa tombol +Titip Pudding & +Belanja Bahan di atas, dan tanpa grafik)
        =================================================================== */}
        {activeTab === 'dashboard' && (
          <>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-[#141414]">
                Dashboard
              </h1>
              <p className="text-sm text-[#6B6B6B] mt-1">
                {(() => {
                  const unpaidOutlets = outlets.filter((o) =>
                    enrichedBatches.some(
                      (b) =>
                        b.outlet_id === o.id &&
                        b.status === 'RECONCILED' &&
                        b.payment_status === 'UNPAID'
                    )
                  ).length;
                  const activeBatches = enrichedBatches.filter(
                    (b) => b.status === 'ACTIVE'
                  ).length;
                  return `${unpaidOutlets} outlet punya tagihan · ${activeBatches} titipan berjalan · kas bersih ${formatIDR(
                    financials.netCash
                  )}`;
                })()}
              </p>
            </div>

            {/* Ringkasan kas: satu wadah, dibagi garis tipis */}
            <section className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-[#E6E5E2] border border-[#E6E5E2] rounded-lg overflow-hidden">
              <div className="bg-white p-4 sm:p-5">
                <p className="text-xs text-[#6B6B6B]">Piutang</p>
                <p className="text-2xl sm:text-3xl font-bold num mt-1.5 text-[#141414]">
                  {formatIDR(financials.unpaidReceivables)}
                </p>
                <p className="text-xs text-[#6B6B6B] mt-1.5">
                  {(() => {
                    const unpaid = enrichedBatches.filter(
                      (b) =>
                        b.status === 'RECONCILED' && b.payment_status === 'UNPAID'
                    );
                    if (unpaid.length === 0) return 'Tidak ada tagihan terbuka';
                    const outletCount = new Set(unpaid.map((b) => b.outlet_id)).size;
                    return `${outletCount} outlet · ${unpaid.length} batch belum dibayar`;
                  })()}
                </p>
                {financials.unpaidReceivables > 0 && (
                  <button
                    type="button"
                    onClick={() => handleSettleAllOutlet('ALL')}
                    className="mt-3 h-8 px-3 rounded-md border border-[#D4D3CF] text-xs font-medium text-[#141414] hover:bg-[#F4F3F0] transition-colors"
                  >
                    Lunasi semua
                  </button>
                )}
              </div>

              <div className="bg-white p-4 sm:p-5">
                <p className="text-xs text-[#6B6B6B]">Uang masuk</p>
                <p className="text-2xl sm:text-3xl font-bold num mt-1.5 text-[#141414]">
                  {formatIDR(financials.realCashIn)}
                </p>
                <p className="text-xs text-[#6B6B6B] mt-1.5">
                  Penjualan yang sudah lunas
                </p>
              </div>

              <div className="bg-white p-4 sm:p-5">
                <p className="text-xs text-[#6B6B6B]">Belanja bahan</p>
                <p className="text-2xl sm:text-3xl font-bold num mt-1.5 text-[#141414]">
                  {formatIDR(financials.totalExpenses)}
                </p>
                <p className="text-xs text-[#6B6B6B] mt-1.5">
                  Dipotong dari kas penjualan
                </p>
              </div>

              <div className="bg-white p-4 sm:p-5">
                <p className="text-xs text-[#6B6B6B]">Kas bersih</p>
                <p
                  className={`text-2xl sm:text-3xl font-bold num mt-1.5 ${
                    financials.netCash < 0 ? 'text-[#C4242A]' : 'text-[#141414]'
                  }`}
                >
                  {formatIDR(financials.netCash)}
                </p>
                <p className="text-xs text-[#6B6B6B] mt-1.5">
                  Setelah belanja · proyeksi{' '}
                  {formatIDR(financials.projectedProfit)}
                </p>
              </div>
            </section>

            {/* Outlet mitra */}
            <section className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-[#141414]">
                  Outlet mitra{' '}
                  <span className="text-sm font-normal text-[#6B6B6B]">
                    {outlets.length}
                  </span>
                </h2>
                <span className="inline-flex items-center gap-1.5 text-xs text-[#6B6B6B]">
                  <MousePointerClick className="w-3.5 h-3.5" />
                  Klik kartu untuk menitipkan pudding
                </span>
              </div>

              <div className="bg-white border border-[#E6E5E2] rounded-lg divide-y divide-[#F0EFEC]">
                {outlets.map((outlet) => {
                  const obatches = enrichedBatches.filter((b) => b.outlet_id === outlet.id);
                  const activeBatch = obatches.find((b) => b.status === 'ACTIVE');
                  // Akumulasi piutang berjalan: seluruh batch RECONCILED + UNPAID
                  // milik outlet ini, termasuk yang menumpuk dari hari-hari sebelumnya.
                  const unpaidBatches = obatches.filter(
                    (b) => b.status === 'RECONCILED' && b.payment_status === 'UNPAID'
                  );
                  const unpaidTotal = unpaidBatches.reduce((sum, b) => sum + b.total_bill, 0);
                  const unpaidOlder = unpaidBatches.filter((b) => b.date < todayStr()).length;

                  return (
                    <div
                      key={outlet.id}
                      onClick={() => {
                        setDropModal({ open: true, outletId: outlet.id });
                        setDropForm({
                          productId: products[0]?.id || 'pudding-coklat',
                          qty: 10,
                          date: todayStr(),
                        });
                      }}
                      className="px-5 py-4 hover:bg-[#FAFAF9] transition-colors cursor-pointer"
                    >
                      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,13rem)_1fr] lg:gap-8 lg:items-start">
                        <div className="space-y-3">
                        {/* Outlet Header */}
                        <div className="space-y-1">
                          <div>
                            <h3 className="text-base font-semibold text-[#141414]">
                              {outlet.name}
                            </h3>
                            <p className="text-xs text-[#6B6B6B] mt-0.5">
                              {outlet.contact}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-[#6B6B6B]">Piutang</p>
                            <p
                              className={`text-lg font-semibold num mt-0.5 ${
                                unpaidTotal > 0 ? 'text-[#141414]' : 'text-[#6B6B6B]'
                              }`}
                            >
                              {unpaidTotal > 0 ? formatIDR(unpaidTotal) : 'Rp 0'}
                            </p>
                            <p className="text-xs text-[#6B6B6B] mt-0.5">
                              {unpaidTotal > 0
                                ? `${unpaidBatches.length} batch belum dibayar${
                                    unpaidOlder > 0 ? ` · ${unpaidOlder} lewat hari` : ''
                                  }`
                                : 'Lunas'}
                            </p>
                          </div>
                        </div>

                        {/* Aksi cepat */}
                        {(activeBatch || unpaidTotal > 0) && (
                          <div
                            className="flex flex-wrap gap-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {activeBatch && (
                              <button
                                type="button"
                                onClick={() => {
                                  setReconcileModal(activeBatch);
                                  setReconcileForm({ qtyReturned: 2, paidNow: false });
                                }}
                                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-[#D4D3CF] text-xs font-medium text-[#141414] hover:bg-[#F4F3F0] transition-colors"
                              >
                                <RotateCcw className="w-3.5 h-3.5" /> Cek sisa ({activeBatch.qty_drop} cup)
                              </button>
                            )}

                            {unpaidTotal > 0 && (
                              <button
                                type="button"
                                onClick={() => handleSettleAllOutlet(outlet.id)}
                                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-[#D4D3CF] text-xs font-medium text-[#141414] hover:bg-[#F4F3F0] transition-colors"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" /> Lunasi{' '}
                                {formatIDR(unpaidTotal)}
                              </button>
                            )}
                          </div>
                        )}

                        </div>
                        {/* Riwayat tanggal di outlet ini */}
                        <div onClick={(e) => e.stopPropagation()}>
                          <p className="text-xs text-[#6B6B6B] mb-1">
                            Riwayat penitipan{' '}
                            <span className="text-[#141414] font-medium">
                              {obatches.length}
                            </span>
                          </p>
                          {obatches.length === 0 ? (
                            <p className="text-xs text-[#6B6B6B] italic py-2">
                              Belum ada riwayat penitipan. Klik kartu ini untuk menitipkan pudding.
                            </p>
                          ) : (
                            <div className="max-h-56 overflow-y-auto">
                              {obatches.map((b) => (
                                <div
                                  key={b.id}
                                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2.5 border-t border-[#F0EFEC] text-xs"
                                >
                                  <div>
                                    <p className="font-medium text-[#141414]">
                                      {b.date} · {b.product_name}
                                    </p>
                                    <p className="text-[#6B6B6B] mt-0.5">
                                      {b.status === 'ACTIVE' ? (
                                        <>Titip {b.qty_drop} cup · sedang dititip</>
                                      ) : (
                                        <>
                                          Titip {b.qty_drop} · sisa {b.qty_returned} · laku{' '}
                                          {b.qty_sold} ={' '}
                                          <span className="text-[#141414] font-medium num">
                                            {formatIDR(b.total_bill)}
                                          </span>
                                        </>
                                      )}
                                    </p>
                                  </div>

                                  <div className="flex items-center gap-1 shrink-0">
                                    {b.status === 'ACTIVE' ? (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setReconcileModal(b);
                                          setReconcileForm({ qtyReturned: 2, paidNow: false });
                                        }}
                                        className="h-7 px-2.5 rounded-md border border-[#D4D3CF] text-xs font-medium text-[#141414] hover:bg-[#F4F3F0] transition-colors"
                                      >
                                        Input sisa
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => handleTogglePaymentStatus(b)}
                                        className={`h-6 px-2 rounded-full text-xs font-medium border ${
                                          b.payment_status === 'PAID'
                                            ? 'bg-[#E7F3E9] text-[#1E5B24] border-[#CDE6D2]'
                                            : 'bg-[#FFFBEB] text-[#92400E] border-[#FDE68A]'
                                        }`}
                                      >
                                        {b.payment_status === 'PAID' ? 'Lunas' : 'Belum dibayar'}
                                      </button>
                                    )}

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditBatchModal(b);
                                        setEditBatchForm({
                                          qty_drop: b.qty_drop,
                                          qty_returned: b.qty_returned ?? 0,
                                        });
                                      }}
                                      className="p-1.5 rounded-md text-[#6B6B6B] hover:bg-[#F0EFEC] hover:text-[#141414] transition-colors"
                                      title="Edit titipan"
                                      aria-label={`Edit titipan ${outlet.name} ${b.date}`}
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setDeleteDialog({
                                          type: 'batch',
                                          id: b.id,
                                          title: `Titipan ${outlet.name} (${b.date})`,
                                        })
                                      }
                                      className="p-1.5 rounded-md text-[#6B6B6B] hover:bg-[#F0EFEC] hover:text-[#C4242A] transition-colors"
                                      title="Hapus titipan"
                                      aria-label={`Hapus titipan ${outlet.name} ${b.date}`}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}

        {/* ===================================================================
            HALAMAN 2: LAPORAN & GRAFIK (SELURUH GRAFIK & ANALITIK)
        =================================================================== */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-[#141414]">
                Laporan
              </h1>
              <p className="text-sm text-[#6B6B6B] mt-1">
                Pemasukan, piutang, belanja bahan, dan performa tiap outlet.
              </p>
            </div>

            {/* Ringkasan laba rugi: satu wadah, dibagi garis tipis */}
            <section className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-[#E6E5E2] border border-[#E6E5E2] rounded-lg overflow-hidden">
              <div className="bg-white p-4 sm:p-5">
                <p className="text-xs text-[#6B6B6B]">Uang masuk</p>
                <p className="text-2xl sm:text-3xl font-bold num mt-1.5 text-[#141414]">
                  {formatIDR(financials.realCashIn)}
                </p>
                <p className="text-xs text-[#6B6B6B] mt-1.5">Sudah lunas</p>
              </div>
              <div className="bg-white p-4 sm:p-5">
                <p className="text-xs text-[#6B6B6B]">Piutang</p>
                <p className="text-2xl sm:text-3xl font-bold num mt-1.5 text-[#141414]">
                  {formatIDR(financials.unpaidReceivables)}
                </p>
                <p className="text-xs text-[#6B6B6B] mt-1.5">Belum dibayar</p>
              </div>
              <div className="bg-white p-4 sm:p-5">
                <p className="text-xs text-[#6B6B6B]">Belanja bahan</p>
                <p className="text-2xl sm:text-3xl font-bold num mt-1.5 text-[#141414]">
                  {formatIDR(financials.totalExpenses)}
                </p>
                <p className="text-xs text-[#6B6B6B] mt-1.5">Bahan baku & kemasan</p>
              </div>
              <div className="bg-white p-4 sm:p-5">
                <p className="text-xs text-[#6B6B6B]">Kas bersih</p>
                <p
                  className={`text-2xl sm:text-3xl font-bold num mt-1.5 ${
                    financials.netCash < 0 ? 'text-[#C4242A]' : 'text-[#141414]'
                  }`}
                >
                  {formatIDR(financials.netCash)}
                </p>
                <p className="text-xs text-[#6B6B6B] mt-1.5">Setelah belanja</p>
              </div>
            </section>

            {/* Diagram Batang & Donat */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white border border-[#E6E5E2] rounded-lg p-5 ">
                <div className="mb-4">
                  <h3 className="text-base font-semibold text-[#141414]">
                    Diagram Pemasukan, Pengeluaran & Keuntungan
                  </h3>
                  <p className="text-xs text-[#6B6B6B]">
                    Perbandingan kas masuk lunas, piutang belum dibayar, belanja bahan, dan kas bersih
                  </p>
                </div>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barChartData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                      <CartesianGrid vertical={false} stroke="#EFEEEA" />
                      <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6B6B6B' }} />
                      <YAxis tick={{ fontSize: 12, fill: '#6B6B6B' }} tickLine={false} axisLine={false} />
                      <ReferenceLine y={0} stroke="#D4D3CF" />
                      <Tooltip formatter={(val) => formatIDR(val)} />
                      <Bar dataKey="nominal" radius={[4, 4, 0, 0]}>
                        {barChartData.map((entry, idx) => (
                          <Cell key={`bar-${idx}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white border border-[#E6E5E2] rounded-lg p-5  flex flex-col justify-between">
                <div>
                  <h3 className="text-base font-semibold text-[#141414]">
                    Diagram Komposisi Belanja
                  </h3>
                  <p className="text-xs text-[#6B6B6B]">
                    Proporsi pengeluaran bahan baku & kemasan
                  </p>
                </div>

                {pieChartData.length === 0 ? (
                  <div className="h-52 flex items-center justify-center text-xs text-[#6B6B6B]">
                    Belum ada pengeluaran tercatat.
                  </div>
                ) : (
                  <div className="h-52 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieChartData}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={52}
                          outerRadius={78}
                          paddingAngle={pieChartData.length > 1 ? 2 : 0}
                        >
                          {pieChartData.map((entry, idx) => (
                            <Cell key={`pie-${idx}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(val) => formatIDR(val)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}

                <div className="space-y-1.5 text-xs pt-2 border-t border-[#F0EFEC]">
                  {pieChartData.map((item) => (
                    <div key={item.name} className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-[#3D3D3D] font-medium">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        {item.name}
                      </span>
                      <span className="font-semibold text-[#141414]">{formatIDR(item.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Tabel Rekapitulasi Performa Per Outlet */}
            <section className="bg-white border border-[#E6E5E2] rounded-lg overflow-hidden ">
              <div className="p-5 border-b border-[#F0EFEC]">
                <h3 className="text-base font-semibold text-[#141414]">
                  Laporan Rekapitulasi Penjualan & Piutang per Outlet
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-xs text-[#6B6B6B] border-b border-[#E6E5E2]"><tr><th className="px-4 py-3 font-normal">Outlet</th><th className="px-4 py-3 font-normal text-right">Titip</th><th className="px-4 py-3 font-normal text-right">Retur</th><th className="px-4 py-3 font-normal text-right">Terjual</th><th className="px-4 py-3 font-normal text-right">Dibayar</th><th className="px-4 py-3 font-normal text-right">Belum dibayar</th></tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0EFEC]">
                    {outlets.map((o) => {
                      const ob = enrichedBatches.filter((b) => b.outlet_id === o.id);
                      const totalDrop = ob.reduce((s, b) => s + b.qty_drop, 0);
                      const totalRet = ob.reduce((s, b) => s + (b.qty_returned || 0), 0);
                      const totalSold = ob.reduce((s, b) => s + b.qty_sold, 0);
                      const paidAmt = ob
                        .filter((b) => b.status === 'RECONCILED' && b.payment_status === 'PAID')
                        .reduce((s, b) => s + b.total_bill, 0);
                      const unpaidAmt = ob
                        .filter((b) => b.status === 'RECONCILED' && b.payment_status === 'UNPAID')
                        .reduce((s, b) => s + b.total_bill, 0);

                      return (
                        <tr key={o.id} className="hover:bg-[#F4F3F0]">
                          <td className="px-4 py-3 text-[#141414]">{o.name}</td><td className="px-4 py-3 text-right num">{totalDrop} cup</td><td className="px-4 py-3 text-right num">{totalRet} cup</td><td className="px-4 py-3 text-right num">{totalSold} cup</td><td className="px-4 py-3 text-right num text-[#6B6B6B]">{formatIDR(paidAmt)}</td><td className={`px-4 py-3 text-right num ${unpaidAmt > 0 ? 'text-[#92400E] font-medium' : 'text-[#6B6B6B]'}`}>{formatIDR(unpaidAmt)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        {/* ===================================================================
            HALAMAN 4: MASTER OUTLET & VARIAN PUDDING
        =================================================================== */}
        {activeTab === 'outlets-variants' && (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-[#141414]">
                  Master outlet &amp; varian
                </h1>
                <p className="text-sm text-[#6B6B6B] mt-1">
                  Kelola outlet mitra dan harga varian pudding.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setOutletModal({ name: '', contact: '' })}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-md text-xs font-bold bg-white border border-[#D4D3CF] text-[#141414] hover:bg-[#F4F3F0]"
                >
                  <Plus className="w-4 h-4" /> Outlet baru
                </button>
                <button
                  onClick={() => {
                    setVariantForm({ id: null, name: '', price: '5000' });
                    setVariantModal(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-md text-xs font-bold bg-[#1D1F20] text-white hover:bg-black"
                >
                  <Plus className="w-4 h-4" /> Varian baru
                </button>
              </div>
            </div>

            {/* KATALOG VARIAN PUDDING & HARGA */}
            <section className="bg-white border border-[#E6E5E2] rounded-lg p-6  space-y-4">
              <div>
                <h3 className="text-base font-semibold text-[#141414]">
                  Katalog Varian Pudding & Harga Satuan
                </h3>
                <p className="text-xs text-[#6B6B6B]">
                  Harga varian otomatis diambil saat Anda menitipkan pudding di kartu outlet.
                </p>
              </div>

              <div className="divide-y divide-[#F0EFEC] border-t border-[#F0EFEC]">
                {products.map((prod) => (
                  <div
                    key={prod.id}
                    className="flex items-center justify-between gap-3 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-[#141414]">{prod.name}</p>
                      <p className="text-xs text-[#6B6B6B] mt-0.5">Harga per cup</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-sm font-semibold num text-[#141414]">
                        {formatIDR(prod.price)}
                      </p>
                      <button
                        onClick={() => {
                          setVariantForm({
                            id: prod.id,
                            name: prod.name,
                            price: String(prod.price),
                          });
                          setVariantModal(true);
                        }}
                        className="p-1.5 rounded-md text-[#6B6B6B] hover:bg-[#F0EFEC] hover:text-[#141414] transition-colors"
                        title="Edit varian"
                        aria-label={`Edit varian ${prod.name}`}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() =>
                          setDeleteDialog({
                            type: 'product',
                            id: prod.id,
                            title: `Varian ${prod.name}`,
                          })
                        }
                        className="p-1.5 rounded-md text-[#6B6B6B] hover:bg-[#F0EFEC] hover:text-[#C4242A] transition-colors"
                        title="Hapus varian"
                        aria-label={`Hapus varian ${prod.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* DAFTAR MASTER OUTLET */}
            <section className="bg-white border border-[#E6E5E2] rounded-lg p-6  space-y-4">
              <div>
                <h3 className="text-base font-semibold text-[#141414]">
                  Outlet mitra <span className="text-sm font-normal text-[#6B6B6B]">{outlets.length}</span>
                </h3>
                <p className="text-xs text-[#6B6B6B]">
                  Muncul sebagai kartu di dashboard.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {outlets.map((o) => {
                  const ob = enrichedBatches.filter((b) => b.outlet_id === o.id);
                  const unpaidBatches = ob.filter(
                    (b) => b.status === 'RECONCILED' && b.payment_status === 'UNPAID'
                  );
                  const unpaidTotal = unpaidBatches.reduce((s, b) => s + b.total_bill, 0);
                  const unpaidOlder = unpaidBatches.filter((b) => b.date < todayStr()).length;
                  return (
                    <div
                      key={o.id}
                      className="p-4 rounded-md border border-[#EFEEEA] flex items-center justify-between gap-3"
                    >
                      <div>
                        <h4 className="font-semibold text-sm text-[#141414]">{o.name}</h4>
                        <p className="text-xs text-[#6B6B6B] mt-0.5">Kontak: {o.contact}</p>
                        <p
                          className={`text-xs mt-1 ${
                            unpaidTotal > 0 ? 'text-[#92400E]' : 'text-[#6B6B6B]'
                          }`}
                        >
                          Piutang:{' '}
                          {unpaidTotal > 0
                            ? `${formatIDR(unpaidTotal)} (${unpaidBatches.length} batch${
                                unpaidOlder > 0 ? `, ${unpaidOlder} dari hari sebelumnya` : ''
                              })`
                            : 'Rp 0'}
                        </p>
                        {unpaidTotal > 0 && (
                          <button
                            type="button"
                            onClick={() => handleSettleAllOutlet(o.id)}
                            className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold bg-[#1D1F20] text-white hover:bg-black"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Bayar Semua
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        
                        <button
                          onClick={() =>
                            setOutletModal({ id: o.id, name: o.name, contact: o.contact })
                          }
                          className="p-2 rounded-md text-[#6B6B6B] hover:bg-[#F0EFEC] hover:text-[#141414] transition-colors"
                          title="Edit Outlet"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() =>
                            setDeleteDialog({ type: 'outlet', id: o.id, title: `Outlet ${o.name}` })
                          }
                          className="p-2 rounded-md text-[#6B6B6B] hover:bg-[#F0EFEC] hover:text-[#C4242A] transition-colors"
                          title="Hapus Outlet"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        )}

        {/* ===================================================================
            HALAMAN 3: RIWAYAT SELURUH TRANSAKSI (UANG MASUK & UANG KELUAR)
        =================================================================== */}
        {activeTab === 'transactions' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-[#141414]">
                  Riwayat transaksi
                </h1>
                <p className="text-sm text-[#6B6B6B] mt-1">
                  Pemasukan, piutang, dan belanja bahan dalam satu daftar.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setExpenseModal(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-md text-xs font-bold bg-[#1D1F20] text-white hover:bg-black"
                >
                  <ShoppingBag className="w-4 h-4" /> Catat belanja bahan
                </button>
              </div>
            </div>

            {/* Akumulasi Piutang per Outlet + Bayar Semua */}
            <div className="bg-white border border-[#E6E5E2] rounded-lg p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="text-xs text-[#6B6B6B]">
                    Piutang belum dibayar
                  </span>
                  <p className="text-xl font-semibold text-[#141414]">
                    {formatIDR(financials.unpaidReceivables)}
                  </p>
                </div>
                {financials.unpaidReceivables > 0 && (
                  <button
                    type="button"
                    onClick={() => handleSettleAllOutlet('ALL')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-md text-xs font-bold bg-[#1D1F20] text-white hover:bg-black"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Bayar Semua Outlet
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {outlets.map((o) => {
                  const unpaidBatches = enrichedBatches.filter(
                    (b) =>
                      b.outlet_id === o.id &&
                      b.status === 'RECONCILED' &&
                      b.payment_status === 'UNPAID'
                  );
                  const total = unpaidBatches.reduce((s, b) => s + b.total_bill, 0);
                  if (total === 0) return null;
                  const older = unpaidBatches.filter((b) => b.date < todayStr()).length;
                  return (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => handleSettleAllOutlet(o.id)}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-white border border-[#D4D3CF] text-xs font-medium text-[#141414] hover:bg-[#F4F3F0]"
                      title={`Bayar semua piutang ${o.name}`}
                    >
                      {o.name}
                      <span className="text-[#141414]">{formatIDR(total)}</span>
                      <span className="font-semibold">
                        ({unpaidBatches.length} batch{older > 0 ? `, ${older} kemarin` : ''})
                      </span>
                      <span className="text-[#6B6B6B]">Bayar</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white border border-[#E6E5E2] rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setTxFilter('ALL')}
                  className={`px-3.5 py-2 rounded-md text-xs font-bold transition ${
                    txFilter === 'ALL'
                      ? 'bg-[#141414] text-white'
                      : 'bg-[#F4F3F0] text-[#3D3D3D] hover:bg-[#F0EFEC]'
                  }`}
                >
                  Semua Transaksi ({unifiedTransactions.length})
                </button>
                <button
                  onClick={() => setTxFilter('CASH_IN')}
                  className={`px-3.5 py-2 rounded-md text-xs font-bold transition ${
                    txFilter === 'CASH_IN'
                      ? 'bg-[#141414] text-white'
                      : 'bg-white text-[#141414] hover:bg-[#F4F3F0]'
                  }`}
                >
                  Uang Masuk / PAID
                </button>
                <button
                  onClick={() => setTxFilter('UNPAID')}
                  className={`px-3.5 py-2 rounded-md text-xs font-bold transition ${
                    txFilter === 'UNPAID'
                      ? 'bg-[#141414] text-white'
                      : 'bg-white text-[#141414] hover:bg-[#F4F3F0]'
                  }`}
                >
                  Belum Dibayar / Aktif
                </button>
                <button
                  onClick={() => setTxFilter('EXPENSE')}
                  className={`px-3.5 py-2 rounded-md text-xs font-bold transition ${
                    txFilter === 'EXPENSE'
                      ? 'bg-[#141414] text-white'
                      : 'bg-white text-[#141414] hover:bg-[#F4F3F0]'
                  }`}
                >
                  Uang Keluar (Belanja Bahan)
                </button>
              </div>

              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-[#6B6B6B]" />
                <select
                  value={txOutletFilter}
                  onChange={(e) => setTxOutletFilter(e.target.value)}
                  className="text-xs border border-[#E6E5E2] rounded-md px-3 py-2 bg-[#F4F3F0] font-bold"
                >
                  <option value="ALL">Semua Outlet</option>
                  {outlets.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tabel Gabungan Seluruh Transaksi */}
            <div className="bg-white border border-[#E6E5E2] rounded-lg overflow-hidden ">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-xs text-[#6B6B6B] border-b border-[#E6E5E2]">
                    <tr>
                      <th className="px-4 py-3 font-normal">Tanggal</th>
                      <th className="px-4 py-3 font-normal">Keterangan</th>
                      <th className="px-4 py-3 font-normal">Status</th>
                      <th className="px-4 py-3 font-normal text-right">Nominal</th>
                      <th className="px-4 py-3 font-normal text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0EFEC]">
                    {filteredTransactions.map((item) => (
                      <tr key={`${item.txType}-${item.id}`} className="hover:bg-[#FAFAF9]">
                        <td className="px-4 py-3 text-[#6B6B6B] whitespace-nowrap num">{item.date}</td>
                        <td className="px-4 py-3">
                          <p className="text-[#141414]">{item.title}</p>
                          <p className="text-[#6B6B6B] mt-0.5">
                            {item.txType === 'EXPENSE'
                              ? 'Belanja bahan'
                              : item.status === 'PAID'
                              ? 'Uang masuk'
                              : 'Konsinyasi'}{' '}
                            · {item.subtitle}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          {item.status === 'PAID' && (
                            <span className="inline-flex h-6 items-center px-2 rounded-full text-xs font-medium bg-[#E7F3E9] text-[#1E5B24] border border-[#CDE6D2]">
                              Lunas
                            </span>
                          )}
                          {item.status === 'UNPAID' && (
                            <span className="inline-flex h-6 items-center px-2 rounded-full text-xs font-medium bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A]">
                              Belum dibayar
                            </span>
                          )}
                          {item.status === 'ACTIVE' && (
                            <span className="inline-flex h-6 items-center px-2 rounded-full text-xs font-medium bg-[#F0EFEC] text-[#3D3D3D]">
                              Dititip
                            </span>
                          )}
                          {item.status === 'EXPENSE' && <span className="text-[#6B6B6B]">—</span>}
                        </td>
                        <td className="px-4 py-3 text-right num whitespace-nowrap">
                          {item.txType === 'EXPENSE' ? (
                            <span className="text-[#141414]">−{formatIDR(item.amount)}</span>
                          ) : item.status === 'ACTIVE' ? (
                            <span className="text-[#6B6B6B]">Menunggu sisa</span>
                          ) : (
                            <span className="text-[#141414]">+{formatIDR(item.amount)}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            {item.txType === 'CONSIGNMENT' && item.status === 'ACTIVE' && (
                              <button
                                onClick={() => {
                                  setReconcileModal(item.raw);
                                  setReconcileForm({ qtyReturned: 2, paidNow: false });
                                }}
                                className="h-7 px-2.5 rounded-md border border-[#D4D3CF] text-xs font-medium text-[#141414] hover:bg-[#F4F3F0] transition-colors"
                              >
                                Input sisa
                              </button>
                            )}

                            {item.txType === 'CONSIGNMENT' && item.status !== 'ACTIVE' && (
                              <button
                                onClick={() => handleTogglePaymentStatus(item.raw)}
                                className="h-7 px-2.5 rounded-md border border-[#D4D3CF] text-xs font-medium text-[#141414] hover:bg-[#F4F3F0] transition-colors"
                              >
                                {item.status === 'UNPAID' ? 'Lunasi' : 'Set unpaid'}
                              </button>
                            )}

                            <button
                              onClick={() => {
                                if (item.txType === 'CONSIGNMENT') {
                                  setEditBatchModal(item.raw);
                                  setEditBatchForm({
                                    qty_drop: item.raw.qty_drop,
                                    qty_returned: item.raw.qty_returned ?? 0,
                                  });
                                } else {
                                  setEditExpenseModal(item.raw);
                                  setEditExpenseForm({
                                    category: item.raw.category,
                                    description: item.raw.description,
                                    amount: item.raw.amount,
                                  });
                                }
                              }}
                              className="p-1.5 rounded-md text-[#6B6B6B] hover:bg-[#F0EFEC] hover:text-[#141414] transition-colors"
                              title="Edit transaksi"
                              aria-label={`Edit ${item.title}`}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() =>
                                setDeleteDialog({
                                  type: item.txType === 'CONSIGNMENT' ? 'batch' : 'expense',
                                  id: item.id,
                                  title: item.title,
                                })
                              }
                              className="p-1.5 rounded-md text-[#6B6B6B] hover:bg-[#F0EFEC] hover:text-[#C4242A] transition-colors"
                              title="Hapus transaksi"
                              aria-label={`Hapus ${item.title}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================
            HALAMAN 4: VALIDASI AI (LIST CHAT BELUM DIPELAJARI AI)
        =================================================================== */}
        {activeTab === 'ai-validation' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-[#141414]">
                Validasi AI
              </h1>
              <p className="text-sm text-[#6B6B6B] mt-1">
                Perintah chat yang belum dikenali AI masuk ke antrean ini. Hapus
                yang di luar cakupan bisnis Melpud.
              </p>
            </div>

            <section className="space-y-3">
              <h2 className="text-base font-semibold text-[#141414]">
                Antrean chat{' '}
                <span className="text-sm font-normal text-[#6B6B6B]">
                  {pendingAiLogs.length}
                </span>
              </h2>

              {pendingAiLogs.length === 0 ? (
                <div className="bg-white border border-[#E6E5E2] rounded-lg p-8 text-center text-sm text-[#6B6B6B]">
                  Tidak ada antrean chat baru. Semua perintah sudah dipelajari atau dihapus.
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingAiLogs.map((item) => (
                    <div
                      key={item.id}
                      className="bg-white border border-[#E6E5E2] rounded-lg p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 "
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-[#92400E]">
                            Perintah sedang dipelajari
                          </span>
                          <span className="text-xs text-[#6B6B6B]">{item.created_at}</span>
                        </div>
                        <p className="text-base font-semibold text-[#141414]">
                          &ldquo;{item.raw_text}&rdquo;
                        </p>
                        <p className="text-xs text-[#6B6B6B]">{item.ai_reason}</p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <select
                          value={selectedIntents[item.id] || item.mapped_intent || 'CREATE_DROP'}
                          onChange={(e) =>
                            setSelectedIntents({
                              ...selectedIntents,
                              [item.id]: e.target.value,
                            })
                          }
                          className="px-3 py-2 text-xs font-bold bg-[#F4F3F0] border border-[#E6E5E2] rounded-md"
                        >
                          <option value="CREATE_DROP">Pelajari: Titip Pudding</option>
                          <option value="RECONCILE_BATCH">Pelajari: Cek Sisa / Retur</option>
                          <option value="SETTLE_PAYMENT">Pelajari: Pelunasan PAID</option>
                          <option value="RECORD_EXPENSE">Pelajari: Belanja Bahan</option>
                        </select>

                        {/* Validasi = Hijau Primer */}
                        <button
                          onClick={() => handleValidateAiLog(item.id)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-bold bg-[#1D1F20] text-white hover:bg-black transition"
                        >
                          <Check className="w-3.5 h-3.5" /> Validasi & Pelajari
                        </button>

                        {/* Hapus / Eliminasi = Merah Primer */}
                        <button
                          onClick={() =>
                            setDeleteDialog({
                              type: 'ai',
                              id: item.id,
                              title: `Chat AI: "${item.raw_text}"`,
                            })
                          }
                          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-[#D4D3CF] text-xs font-medium text-[#141414] hover:bg-[#F4F3F0] transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Hapus
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {learnedAiLogs.length > 0 && (
              <section className="space-y-3 pt-4 border-t border-[#E6E5E2]">
                <h3 className="text-sm font-semibold text-[#3D3D3D]">
                  Perintah yang Sudah Dipelajari ({learnedAiLogs.length})
                </h3>
                <div className="bg-white border border-[#E6E5E2] rounded-lg divide-y divide-[#F0EFEC]">
                  {learnedAiLogs.map((l) => (
                    <div
                      key={l.id}
                      className="p-4 flex items-center justify-between gap-3"
                    >
                      <div>
                        <p className="text-sm font-bold text-[#141414]">
                          &ldquo;{l.raw_text}&rdquo;
                        </p>
                        <span className="text-xs text-[#2E7D32] font-bold">
                          Kategori: {l.mapped_intent}
                        </span>
                      </div>
                      <button
                        onClick={() =>
                          setDeleteDialog({
                            type: 'ai',
                            id: l.id,
                            title: `Chat AI: "${l.raw_text}"`,
                          })
                        }
                        className="p-2 rounded-md text-[#6B6B6B] hover:bg-[#F0EFEC] hover:text-[#C4242A] transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>

      {/* =====================================================================
          FLOATING CHAT AI SEPERTI WHATSAPP DI POJOK KANAN BAWAH
          (HANYA KOLOM CHAT + TOMBOL KIRIM, TANPA FITUR TIDAK JELAS)
      ===================================================================== */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end">
        {chatOpen && (
          <div className="mb-3 w-80 sm:w-96 bg-white rounded-lg shadow-2xl border border-[#E6E5E2] overflow-hidden flex flex-col">
            {/* Header Chat WA Style */}
            <div className="bg-[#1D1F20] text-white px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-semibold text-sm">
                  AI
                </div>
                <div>
                  <h4 className="text-sm font-semibold leading-tight">Melpud AI Chat</h4>
                  <span className="text-xs text-emerald-300 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Online • Pencatat Otomatis
                  </span>
                </div>
              </div>
              <button
                onClick={() => setChatOpen(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Area Bubble Chat */}
            <div className="h-80 overflow-y-auto p-3.5 space-y-2.5 bg-[#EDECEA]">
              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    msg.sender === 'user' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div
                    className={`max-w-[82%] rounded-lg px-3.5 py-2 text-xs leading-relaxed  ${
                      msg.sender === 'user'
                        ? 'bg-[#5C3A21] text-white rounded-br-none'
                        : msg.isLearning
                        ? 'bg-[#FFFBEB] text-[#141414] border border-[#FDE68A] rounded-bl-none'
                        : 'bg-white text-[#141414] rounded-bl-none'
                    }`}
                  >
                    <p>{msg.text}</p>
                    {/* Kartu konfirmasi aksi AI: detail parameter + Konfirmasi/Batal.
                        Eksekusi ke Supabase HANYA terjadi saat tombol ditekan. */}
                    {msg.confirm && (
                      <div className="mt-2 border-t border-[#E6E5E2] pt-2 space-y-2">
                        <dl className="space-y-1">
                          {msg.confirm.summary.map(([label, value]) => (
                            <div
                              key={label}
                              className="flex items-start justify-between gap-3 text-xs"
                            >
                              <dt className="text-[#6B6B6B] font-semibold shrink-0">{label}</dt>
                              <dd className="font-semibold text-[#141414] text-right break-all">
                                {value}
                              </dd>
                            </div>
                          ))}
                        </dl>
                        {msg.confirmState === 'idle' && (
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleConfirmAiAction(msg.id)}
                              className="flex-1 px-3 py-2 rounded-md text-xs font-semibold bg-[#1D1F20] text-white hover:bg-black"
                            >
                              Konfirmasi &amp; Jalankan
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCancelAiAction(msg.id)}
                              className="px-3 py-2 rounded-md text-xs font-bold bg-white border border-[#E6E5E2] text-[#6B6B6B] hover:bg-[#F4F3F0]"
                            >
                              Batal
                            </button>
                          </div>
                        )}
                        {msg.confirmState === 'running' && (
                          <p className="text-xs font-bold text-[#1D1F20]">
                            Menjalankan aksi ke Supabase…
                          </p>
                        )}
                        {msg.confirmState === 'done' && (
                          <p className="text-xs font-bold text-[#2E7D32]">
                            Selesai dijalankan ✓
                          </p>
                        )}
                        {msg.confirmState === 'cancelled' && (
                          <p className="text-xs font-bold text-[#6B6B6B]">
                            Dibatalkan — tidak ada data yang diubah.
                          </p>
                        )}
                      </div>
                    )}
                    <span
                      className={`block text-xs mt-1 text-right ${
                        msg.sender === 'user' ? 'text-amber-100/80' : 'text-[#6B6B6B]'
                      }`}
                    >
                      {msg.time}
                    </span>
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* Form Input Simple: Kolom Chat + Tombol Kirim Saja */}
            <form
              onSubmit={handleSendChat}
              className="p-2.5 bg-white border-t border-[#E6E5E2] flex items-center gap-2"
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ketik pesan perintah..."
                className="flex-1 px-3.5 py-2 text-xs bg-[#F4F3F0] border border-[#E6E5E2] rounded-full focus:outline-none focus:border-[#5C3A21]"
              />
              <button
                type="submit"
                className="w-9 h-9 rounded-full bg-[#5C3A21] hover:bg-[#4A2E1B] text-white flex items-center justify-center shrink-0 transition"
                title="Kirim"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {/* Tombol Floating Bulat di Pojok Kanan Bawah */}
        <button
          onClick={() => setChatOpen((prev) => !prev)}
          className="h-12 px-4 rounded-full bg-[#1D1F20] hover:bg-black text-white shadow-xl flex items-center gap-2.5 font-semibold text-xs transition-transform active:scale-95"
        >
          {chatOpen ? (
            <>
              <X className="w-5 h-5" /> Tutup Chat
            </>
          ) : (
            <>
              <MessageCircle className="w-5 h-5" /> Chat AI Melpud
            </>
          )}
        </button>
      </div>

      {/* =====================================================================
          MODALS CRUD
      ===================================================================== */}
      {/* MODAL 1: TITIP PUDDING BARU (COKLAT) */}
      {dropModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <form
            onSubmit={handleCreateDrop}
            className="bg-white rounded-lg max-w-md w-full p-6 space-y-4 shadow-xl border-t border-[#E6E5E2]"
          >
            <div className="flex items-center gap-2 text-[#5C3A21] font-semibold">
              <PlusCircle className="w-5 h-5" />
              <h3>Titip Pudding ke Outlet</h3>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#3D3D3D] mb-1">
                Pilih Outlet
              </label>
              <select
                value={dropModal.outletId}
                onChange={(e) => setDropModal({ ...dropModal, outletId: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#E6E5E2] rounded-md"
              >
                {outlets.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#3D3D3D] mb-1">
                Varian Pudding
              </label>
              <select
                value={dropForm.productId}
                onChange={(e) => setDropForm({ ...dropForm, productId: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#E6E5E2] rounded-md"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({formatIDR(p.price)}/cup)
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#3D3D3D] mb-1">
                  Jumlah Cup
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={dropForm.qty}
                  onChange={(e) => setDropForm({ ...dropForm, qty: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-[#E6E5E2] rounded-md"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#3D3D3D] mb-1">
                  Tanggal
                </label>
                <input
                  type="date"
                  value={dropForm.date}
                  onChange={(e) => setDropForm({ ...dropForm, date: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-[#E6E5E2] rounded-md"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDropModal({ open: false, outletId: 'p-bungin' })}
                className="px-4 py-2 text-xs font-bold text-[#3D3D3D] bg-[#F4F3F0] rounded-md"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold text-white bg-[#5C3A21] hover:bg-[#4A2E1B] rounded-md"
              >
                Simpan Titipan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 2: CEK SISA / RETUR (BIRU PRIMER) */}
      {reconcileModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <form
            onSubmit={handleReconcileSave}
            className="bg-white rounded-lg max-w-md w-full p-6 space-y-4 shadow-xl border-t border-[#E6E5E2]"
          >
            <div className="flex items-center gap-2 text-[#1D1F20] font-semibold">
              <RotateCcw className="w-5 h-5" />
              <h3>Cek Sisa Cup & Status Pembayaran</h3>
            </div>
            <p className="text-xs text-[#5F5F5F]">
              Outlet: <strong>{reconcileModal.outlet_name}</strong> • Titip Awal:{' '}
              <strong>{reconcileModal.qty_drop} cup</strong> ({reconcileModal.product_name})
            </p>
            <div>
              <label className="block text-xs font-bold text-[#3D3D3D] mb-1">
                Berapa Sisa Cup yang Diambil?
              </label>
              <input
                type="number"
                min={0}
                max={reconcileModal.qty_drop}
                required
                value={reconcileForm.qtyReturned}
                onChange={(e) =>
                  setReconcileForm({ ...reconcileForm, qtyReturned: e.target.value })
                }
                className="w-full px-3 py-2 text-sm border border-[#E6E5E2] rounded-md"
              />
            </div>
            <div className="p-3.5 rounded-md bg-blue-50 border border-blue-200 text-xs text-blue-950 space-y-1">
              <div>
                Terjual:{' '}
                <strong>
                  {Math.max(0, reconcileModal.qty_drop - Number(reconcileForm.qtyReturned))} cup
                </strong>
              </div>
              <div>
                Tagihan:{' '}
                <strong className="text-sm">
                  {formatIDR(
                    Math.max(0, reconcileModal.qty_drop - Number(reconcileForm.qtyReturned)) *
                      reconcileModal.price_unit
                  )}
                </strong>
              </div>
            </div>
            <label className="flex items-center gap-2 text-xs font-bold text-[#141414] cursor-pointer">
              <input
                type="checkbox"
                checked={reconcileForm.paidNow}
                onChange={(e) =>
                  setReconcileForm({ ...reconcileForm, paidNow: e.target.checked })
                }
              />
              Sudah dibayar lunas (PAID). Biarkan kosong jika belum dibayar (UNPAID).
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReconcileModal(null)}
                className="px-4 py-2 text-xs font-bold text-[#3D3D3D] bg-[#F4F3F0] rounded-md"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold text-white bg-[#1D1F20] hover:bg-blue-800 rounded-md"
              >
                Simpan Sisa
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 3: EDIT DATA TITIPAN (KUNING/AMBER PRIMER) */}
      {editBatchModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <form
            onSubmit={handleEditBatchSave}
            className="bg-white rounded-lg max-w-md w-full p-6 space-y-4 shadow-xl border-t border-[#E6E5E2]"
          >
            <div className="flex items-center gap-2 text-[#92400E] font-semibold">
              <Pencil className="w-5 h-5" />
              <h3>Edit Data Titipan ({editBatchModal.outlet_name})</h3>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#3D3D3D] mb-1">
                Jumlah Cup Titip
              </label>
              <input
                type="number"
                min={1}
                value={editBatchForm.qty_drop}
                onChange={(e) =>
                  setEditBatchForm({ ...editBatchForm, qty_drop: e.target.value })
                }
                className="w-full px-3 py-2 text-sm border border-[#E6E5E2] rounded-md"
              />
            </div>
            {editBatchModal.status === 'RECONCILED' && (
              <div>
                <label className="block text-xs font-bold text-[#3D3D3D] mb-1">
                  Jumlah Cup Sisa
                </label>
                <input
                  type="number"
                  min={0}
                  max={editBatchForm.qty_drop}
                  value={editBatchForm.qty_returned}
                  onChange={(e) =>
                    setEditBatchForm({ ...editBatchForm, qty_returned: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-[#E6E5E2] rounded-md"
                />
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditBatchModal(null)}
                className="px-4 py-2 text-xs font-bold text-[#3D3D3D] bg-[#F4F3F0] rounded-md"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold text-white bg-[#92400E] hover:bg-amber-700 rounded-md"
              >
                Simpan Perubahan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 4: CATAT BELANJA BAHAN / UANG KELUAR (MERAH PRIMER) */}
      {expenseModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <form
            onSubmit={handleCreateExpense}
            className="bg-white rounded-lg max-w-md w-full p-6 space-y-4 shadow-xl border-t border-[#E6E5E2]"
          >
            <div className="flex items-center gap-2 text-[#C4242A] font-semibold">
              <ShoppingBag className="w-5 h-5" />
              <h3>Catat Belanja Bahan (Uang Keluar)</h3>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#3D3D3D] mb-1">
                Kategori Pengeluaran
              </label>
              <select
                value={expenseForm.category}
                onChange={(e) =>
                  setExpenseForm({ ...expenseForm, category: e.target.value })
                }
                className="w-full px-3 py-2 text-sm border border-[#E6E5E2] rounded-md"
              >
                <option value="Bahan Baku Utama">Bahan Baku Utama</option>
                <option value="Kemasan">Kemasan</option>
                <option value="Operasional Lainnya">Operasional Lainnya</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#3D3D3D] mb-1">
                Nama Barang / Bahan
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: Susu cair, coklat bubuk, agar-agar"
                value={expenseForm.description}
                onChange={(e) =>
                  setExpenseForm({ ...expenseForm, description: e.target.value })
                }
                className="w-full px-3 py-2 text-sm border border-[#E6E5E2] rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#3D3D3D] mb-1">
                Nominal Belanja (Rp)
              </label>
              <input
                type="number"
                min={100}
                required
                placeholder="45000"
                value={expenseForm.amount}
                onChange={(e) =>
                  setExpenseForm({ ...expenseForm, amount: e.target.value })
                }
                className="w-full px-3 py-2 text-sm border border-[#E6E5E2] rounded-md"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setExpenseModal(false)}
                className="px-4 py-2 text-xs font-bold text-[#3D3D3D] bg-[#F4F3F0] rounded-md"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold text-white bg-[#C4242A] hover:bg-red-700 rounded-md"
              >
                Simpan & Potong Kas
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 5: EDIT BELANJA (KUNING PRIMER) */}
      {editExpenseModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <form
            onSubmit={handleEditExpenseSave}
            className="bg-white rounded-lg max-w-md w-full p-6 space-y-4 shadow-xl border-t border-[#E6E5E2]"
          >
            <div className="flex items-center gap-2 text-[#92400E] font-semibold">
              <Pencil className="w-5 h-5" />
              <h3>Edit Catatan Belanja</h3>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#3D3D3D] mb-1">
                Kategori
              </label>
              <select
                value={editExpenseForm.category}
                onChange={(e) =>
                  setEditExpenseForm({ ...editExpenseForm, category: e.target.value })
                }
                className="w-full px-3 py-2 text-sm border border-[#E6E5E2] rounded-md"
              >
                <option value="Bahan Baku Utama">Bahan Baku Utama</option>
                <option value="Kemasan">Kemasan</option>
                <option value="Operasional Lainnya">Operasional Lainnya</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#3D3D3D] mb-1">
                Keterangan Barang
              </label>
              <input
                type="text"
                required
                value={editExpenseForm.description}
                onChange={(e) =>
                  setEditExpenseForm({ ...editExpenseForm, description: e.target.value })
                }
                className="w-full px-3 py-2 text-sm border border-[#E6E5E2] rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#3D3D3D] mb-1">
                Nominal (Rp)
              </label>
              <input
                type="number"
                min={100}
                required
                value={editExpenseForm.amount}
                onChange={(e) =>
                  setEditExpenseForm({ ...editExpenseForm, amount: e.target.value })
                }
                className="w-full px-3 py-2 text-sm border border-[#E6E5E2] rounded-md"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditExpenseModal(null)}
                className="px-4 py-2 text-xs font-bold text-[#3D3D3D] bg-[#F4F3F0] rounded-md"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold text-white bg-[#92400E] hover:bg-amber-700 rounded-md"
              >
                Update Belanja
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 6: TAMBAH / EDIT OUTLET (COKLAT) */}
      {outletModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <form
            onSubmit={handleSaveOutlet}
            className="bg-white rounded-lg max-w-md w-full p-6 space-y-4 shadow-xl border-t border-[#E6E5E2]"
          >
            <div className="flex items-center gap-2 text-[#5C3A21] font-semibold">
              <Store className="w-5 h-5" />
              <h3>{outletModal.id ? 'Edit Outlet Mitra' : 'Tambah Outlet Mitra Baru'}</h3>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#3D3D3D] mb-1">
                Nama Outlet
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: P. TANJUNG"
                value={outletModal.name}
                onChange={(e) => setOutletModal({ ...outletModal, name: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#E6E5E2] rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#3D3D3D] mb-1">
                Nomor Kontak / WA
              </label>
              <input
                type="text"
                placeholder="0812-xxxx-xxxx"
                value={outletModal.contact ?? ''}
                onChange={(e) => setOutletModal({ ...outletModal, contact: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#E6E5E2] rounded-md"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setOutletModal(null)}
                className="px-4 py-2 text-xs font-bold text-[#3D3D3D] bg-[#F4F3F0] rounded-md"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold text-white bg-[#5C3A21] hover:bg-[#4A2E1B] rounded-md"
              >
                Simpan Outlet
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 7: TAMBAH / EDIT VARIAN PUDDING (COKLAT) */}
      {variantModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <form
            onSubmit={handleSaveVariant}
            className="bg-white rounded-lg max-w-md w-full p-6 space-y-4 shadow-xl border-t border-[#E6E5E2]"
          >
            <div className="flex items-center gap-2 text-[#5C3A21] font-semibold">
              <Plus className="w-5 h-5" />
              <h3>{variantForm.id ? 'Edit Varian Pudding' : 'Tambah Varian Pudding Baru'}</h3>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#3D3D3D] mb-1">
                Nama Varian
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: Pudding Coklat / Pudding Stroberi"
                value={variantForm.name}
                onChange={(e) =>
                  setVariantForm({ ...variantForm, name: e.target.value })
                }
                className="w-full px-3 py-2 text-sm border border-[#E6E5E2] rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#3D3D3D] mb-1">
                Harga per Cup (Rp)
              </label>
              <input
                type="number"
                min={500}
                required
                value={variantForm.price}
                onChange={(e) =>
                  setVariantForm({ ...variantForm, price: e.target.value })
                }
                className="w-full px-3 py-2 text-sm border border-[#E6E5E2] rounded-md"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setVariantModal(false)}
                className="px-4 py-2 text-xs font-bold text-[#3D3D3D] bg-[#F4F3F0] rounded-md"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold text-white bg-[#5C3A21] hover:bg-[#4A2E1B] rounded-md"
              >
                Simpan Varian
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 8: KONFIRMASI HAPUS (MERAH PRIMER) */}
      {deleteDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-sm w-full p-6 space-y-4 shadow-xl border-t border-[#E6E5E2]">
            <div className="flex items-center gap-2 text-[#C4242A] font-semibold">
              <Trash2 className="w-5 h-5" />
              <h3>Konfirmasi Hapus</h3>
            </div>
            <p className="text-xs text-[#3D3D3D]">
              Apakah Anda yakin ingin menghapus data berikut secara permanen:{' '}
              <strong className="text-[#141414]">{deleteDialog.title}</strong>?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteDialog(null)}
                className="px-4 py-2 text-xs font-bold text-[#3D3D3D] bg-[#F4F3F0] rounded-md"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDeleteAction}
                className="px-4 py-2 text-xs font-bold text-white bg-[#C4242A] hover:bg-red-700 rounded-md"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}