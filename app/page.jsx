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
} from 'recharts';

// ============================================================================
// HELPER FORMATTERS
// ============================================================================
const formatIDR = (val) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(val || 0);

const todayStr = () => new Date().toISOString().split('T')[0];
const nowTimeStr = () =>
  new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

// ============================================================================
// INITIAL MASTER DATA & SEED (PRD v2.2)
// ============================================================================
const INITIAL_OUTLETS = [
  { id: 'p-bungin', name: 'P. BUNGIN', contact: '0812-3456-7890', active: true },
  { id: 'p-moyo-conato', name: 'P. MOYO CONATO', contact: '0813-9876-5432', active: true },
  { id: 'p-singkep', name: 'P. SINGKEP', contact: '0811-2233-4455', active: true },
  { id: 'bubuh-bali', name: 'BUBUH BALI', contact: '0878-6543-2109', active: true },
  { id: 'skensa-mami', name: 'SKENSA MAMI', contact: '0857-1122-3344', active: true },
];

const INITIAL_PRODUCTS = [
  { id: 'pudding-coklat', name: 'Pudding Coklat', price: 5000 },
  { id: 'pudding-mangga', name: 'Pudding Mangga', price: 5000 },
  { id: 'pudding-matcha', name: 'Pudding Matcha', price: 6000 },
];

const INITIAL_BATCHES = [
  {
    id: 'b-101',
    date: '2026-11-15',
    outlet_id: 'p-bungin',
    product_id: 'pudding-coklat',
    product_name: 'Pudding Coklat',
    qty_drop: 10,
    qty_returned: null,
    price_unit: 5000,
    status: 'ACTIVE',
    payment_status: 'UNPAID',
    paid_at: null,
  },
  {
    id: 'b-102',
    date: '2026-11-14',
    outlet_id: 'p-bungin',
    product_id: 'pudding-coklat',
    product_name: 'Pudding Coklat',
    qty_drop: 10,
    qty_returned: 2,
    price_unit: 5000,
    status: 'RECONCILED',
    payment_status: 'UNPAID',
    paid_at: null,
  },
  {
    id: 'b-103',
    date: '2026-11-14',
    outlet_id: 'p-moyo-conato',
    product_id: 'pudding-coklat',
    product_name: 'Pudding Coklat',
    qty_drop: 12,
    qty_returned: 0,
    price_unit: 5000,
    status: 'RECONCILED',
    payment_status: 'PAID',
    paid_at: '2026-11-14',
  },
  {
    id: 'b-104',
    date: '2026-11-15',
    outlet_id: 'p-singkep',
    product_id: 'pudding-coklat',
    product_name: 'Pudding Coklat',
    qty_drop: 8,
    qty_returned: null,
    price_unit: 5000,
    status: 'ACTIVE',
    payment_status: 'UNPAID',
    paid_at: null,
  },
  {
    id: 'b-105',
    date: '2026-11-13',
    outlet_id: 'bubuh-bali',
    product_id: 'pudding-coklat',
    product_name: 'Pudding Coklat',
    qty_drop: 10,
    qty_returned: 3,
    price_unit: 5000,
    status: 'RECONCILED',
    payment_status: 'UNPAID',
    paid_at: null,
  },
  {
    id: 'b-106',
    date: '2026-11-13',
    outlet_id: 'skensa-mami',
    product_id: 'pudding-coklat',
    product_name: 'Pudding Coklat',
    qty_drop: 15,
    qty_returned: 1,
    price_unit: 5000,
    status: 'RECONCILED',
    payment_status: 'PAID',
    paid_at: '2026-11-13',
  },
];

const INITIAL_EXPENSES = [
  {
    id: 'e-201',
    date: '2026-11-13',
    category: 'Bahan Baku Utama',
    description: 'Susu cair full cream, bubuk coklat & agar-agar',
    amount: 42000,
  },
  {
    id: 'e-202',
    date: '2026-11-14',
    category: 'Kemasan',
    description: 'Cup puding 100pcs + sendok plastik',
    amount: 23000,
  },
];

const INITIAL_AI_LOGS = [
  {
    id: 'ai-301',
    raw_text: 'besok cuaca di denpasar hujan atau panas ya?',
    ai_reason: 'Perintah sedang dipelajari (di luar cakupan operasional Melpud)',
    status: 'PENDING',
    mapped_intent: null,
    created_at: '2026-11-15 09:15',
  },
  {
    id: 'ai-302',
    raw_text: 'drop skensa mami 12 cup coklat',
    ai_reason: 'Perintah sedang dipelajari (pola kata baru menunggu validasi)',
    status: 'PENDING',
    mapped_intent: 'CREATE_DROP',
    created_at: '2026-11-15 10:40',
  },
];

const EXPENSE_COLORS = {
  'Bahan Baku Utama': '#5C3A21', // Coklat Pudding
  Kemasan: '#1D4ED8', // Biru Primer
  'Operasional Lainnya': '#D97706', // Kuning/Amber Primer
};

export default function App() {
  // 5 Halaman Utama: 'dashboard' | 'reports' | 'transactions' | 'outlets-variants' | 'ai-validation'
  const [activeTab, setActiveTab] = useState('dashboard');

  // Master & Transaksi State
  const [outlets, setOutlets] = useState(INITIAL_OUTLETS);
  const [products, setProducts] = useState(INITIAL_PRODUCTS);
  const [batches, setBatches] = useState(INITIAL_BATCHES);
  const [expenses, setExpenses] = useState(INITIAL_EXPENSES);
  const [aiLogs, setAiLogs] = useState(INITIAL_AI_LOGS);

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
  const [newOutletModal, setNewOutletModal] = useState(false);
  const [newOutletForm, setNewOutletForm] = useState({ name: '', contact: '' });

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
        outlet_name: outletObj ? outletObj.name : b.outlet_id,
      };
    });
  }, [batches, outlets]);

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
  // WHATSAPP-STYLE AI AGENT PARSER & AUTO-EXECUTION
  // ============================================================================
  const processAndExecuteAiChat = (rawText) => {
    const text = rawText.toLowerCase().trim();

    const matchedOutlet = outlets.find((o) => {
      const cleanName = o.name.toLowerCase().replace(/\./g, '').trim();
      const shortName = cleanName.replace(/^p\s+/, '');
      return text.includes(cleanName) || text.includes(shortName);
    });

    const matchedProduct =
      products.find((p) =>
        text.includes(p.name.toLowerCase().replace('pudding ', '').trim())
      ) || products[0];

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

    // 1. EXPENSE (Uang Keluar Belanja Bahan)
    if (
      text.includes('belanja') ||
      text.includes('beli') ||
      text.includes('bensin') ||
      (customLearned && customLearned.mapped_intent === 'RECORD_EXPENSE')
    ) {
      const amount = parseNominal(text);
      if (amount) {
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

        const newExp = {
          id: `e-${Date.now()}`,
          date: todayStr(),
          category,
          description: rawText,
          amount,
        };
        setExpenses((prev) => [newExp, ...prev]);
        return {
          recognized: true,
          reply: `Berhasil dicatat ke Uang Keluar (${category}): "${rawText}" sebesar ${formatIDR(
            amount
          )}. Saldo kas otomatis dipotong.`,
        };
      }
    }

    // 2. RECONCILE / SISA CUP
    if ((text.includes('sisa') || text.includes('retur')) && matchedOutlet) {
      const sisaMatch =
        text.match(/(?:sisa|retur)\s*(\d+)/i) || text.match(/(\d+)\s*cup/i);
      const qtyReturned = sisaMatch ? parseInt(sisaMatch[1], 10) : 0;
      const isPaid =
        (text.includes('sudah dibayar') ||
          text.includes('udah bayar') ||
          text.includes('lunas')) &&
        !text.includes('belum') &&
        !text.includes('belom');

      const targetBatch = batches.find(
        (b) => b.outlet_id === matchedOutlet.id && b.status === 'ACTIVE'
      );

      if (targetBatch) {
        const safeRet = Math.min(targetBatch.qty_drop, Math.max(0, qtyReturned));
        const sold = targetBatch.qty_drop - safeRet;
        const bill = sold * targetBatch.price_unit;

        setBatches((prev) =>
          prev.map((b) =>
            b.id === targetBatch.id
              ? {
                  ...b,
                  qty_returned: safeRet,
                  status: 'RECONCILED',
                  payment_status: isPaid ? 'PAID' : 'UNPAID',
                  paid_at: isPaid ? todayStr() : null,
                }
              : b
          )
        );
        return {
          recognized: true,
          reply: `Rekonsiliasi ${matchedOutlet.name} selesai: Sisa ${safeRet} cup (Laku ${sold} cup = ${formatIDR(
            bill
          )}). Status: ${isPaid ? 'PAID (Lunas)' : 'UNPAID (Belum Dibayar)'}.`,
        };
      } else {
        return {
          recognized: true,
          reply: `Saat ini tidak ada stok berstatus ACTIVE di ${matchedOutlet.name} untuk dihitung sisanya.`,
        };
      }
    }

    // 3. PELUNASAN (SETTLE PAYMENT)
    if (
      (text.includes('lunas') ||
        text.includes('sudah dibayar') ||
        text.includes('udah bayar')) &&
      !text.includes('belum') &&
      !text.includes('belom') &&
      matchedOutlet
    ) {
      const unpaid = enrichedBatches.filter(
        (b) =>
          b.outlet_id === matchedOutlet.id &&
          b.status === 'RECONCILED' &&
          b.payment_status === 'UNPAID'
      );
      if (unpaid.length === 0) {
        return {
          recognized: true,
          reply: `Semua tagihan di ${matchedOutlet.name} sudah berstatus PAID (Lunas).`,
        };
      }
      const totalSettled = unpaid.reduce((s, b) => s + b.total_bill, 0);
      setBatches((prev) =>
        prev.map((b) =>
          b.outlet_id === matchedOutlet.id &&
          b.status === 'RECONCILED' &&
          b.payment_status === 'UNPAID'
            ? { ...b, payment_status: 'PAID', paid_at: todayStr() }
            : b
        )
      );
      return {
        recognized: true,
        reply: `Status pembayaran ${matchedOutlet.name} diubah menjadi PAID (Lunas). Uang masuk bertambah ${formatIDR(
          totalSettled
        )}.`,
      };
    }

    // 4. CREATE DROP (TITIP PUDDING)
    if (
      (text.includes('taruh') ||
        text.includes('titip') ||
        text.includes('naruh') ||
        text.includes('masukkan') ||
        (customLearned && customLearned.mapped_intent === 'CREATE_DROP')) &&
      matchedOutlet
    ) {
      const qtyMatch = text.match(/(\d+)\s*(?:cup|pcs|puding|pudding)?/i);
      const qty = qtyMatch ? parseInt(qtyMatch[1], 10) : 10;

      const newBatch = {
        id: `b-${Date.now()}`,
        date: todayStr(),
        outlet_id: matchedOutlet.id,
        product_id: matchedProduct.id,
        product_name: matchedProduct.name,
        qty_drop: qty,
        qty_returned: null,
        price_unit: matchedProduct.price,
        status: 'ACTIVE',
        payment_status: 'UNPAID',
        paid_at: null,
      };
      setBatches((prev) => [newBatch, ...prev]);
      return {
        recognized: true,
        reply: `Berhasil mencatat titipan ${qty} cup ${matchedProduct.name} di outlet ${matchedOutlet.name} pada tanggal ${todayStr()}.`,
      };
    }

    // 5. PERINTAH BARU / TIDAK DIKENALI -> MASUK KE VALIDASI AI
    const newLog = {
      id: `ai-${Date.now()}`,
      raw_text: rawText,
      ai_reason: 'Perintah sedang dipelajari dan menunggu validasi admin',
      status: 'PENDING',
      mapped_intent: 'CREATE_DROP',
      created_at: new Date().toLocaleString('id-ID'),
    };
    setAiLogs((prev) => [newLog, ...prev]);
    return {
      recognized: false,
      reply:
        'Perintah sedang dipelajari dan telah dimasukkan ke halaman Validasi AI.',
    };
  };

  const handleSendChat = (e) => {
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

    setTimeout(() => {
      const res = processAndExecuteAiChat(text);
      const botMsg = {
        id: `b-${Date.now() + 1}`,
        sender: 'bot',
        text: res.reply,
        isLearning: !res.recognized,
        time: nowTimeStr(),
      };
      setChatMessages((prev) => [...prev, botMsg]);
    }, 250);
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
  };

  const handleSettleAllOutlet = (outletId) => {
    setBatches((prev) =>
      prev.map((b) =>
        b.outlet_id === outletId && b.status === 'RECONCILED' && b.payment_status === 'UNPAID'
          ? { ...b, payment_status: 'PAID', paid_at: todayStr() }
          : b
      )
    );
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
    setEditExpenseModal(null);
  };

  const handleAddOutlet = (e) => {
    e.preventDefault();
    if (!newOutletForm.name.trim()) return;
    const id = newOutletForm.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    setOutlets((prev) => [
      ...prev,
      {
        id: `${id}-${Date.now()}`,
        name: newOutletForm.name.toUpperCase().trim(),
        contact: newOutletForm.contact || '-',
        active: true,
      },
    ]);
    setNewOutletForm({ name: '', contact: '' });
    setNewOutletModal(false);
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
    } else {
      // Create new variant
      const slug = variantForm.name.toLowerCase().replace(/\s+/g, '-');
      setProducts((prev) => [
        ...prev,
        {
          id: `${slug}-${Date.now()}`,
          name: variantForm.name.trim(),
          price: Math.max(500, Number(variantForm.price)),
        },
      ]);
    }
    setVariantForm({ id: null, name: '', price: '5000' });
    setVariantModal(false);
  };

  const confirmDeleteAction = () => {
    if (!deleteDialog) return;
    if (deleteDialog.type === 'batch') {
      setBatches((prev) => prev.filter((b) => b.id !== deleteDialog.id));
    } else if (deleteDialog.type === 'expense') {
      setExpenses((prev) => prev.filter((e) => e.id !== deleteDialog.id));
    } else if (deleteDialog.type === 'ai') {
      setAiLogs((prev) => prev.filter((l) => l.id !== deleteDialog.id));
    } else if (deleteDialog.type === 'product') {
      setProducts((prev) => prev.filter((p) => p.id !== deleteDialog.id));
    }
    setDeleteDialog(null);
  };

  const handleValidateAiLog = (id) => {
    const chosenIntent = selectedIntents[id] || 'CREATE_DROP';
    setAiLogs((prev) =>
      prev.map((l) =>
        l.id === id
          ? {
              ...l,
              status: 'LEARNED',
              mapped_intent: chosenIntent,
              ai_reason: `Telah divalidasi & dipelajari sebagai ${chosenIntent}`,
            }
          : l
      )
    );
  };

  // ============================================================================
  // CHARTS & COMBINED TRANSACTIONS LEDGER
  // ============================================================================
  const barChartData = [
    { name: 'Uang Masuk (Lunas)', nominal: financials.realCashIn, fill: '#15803D' }, // Hijau Primer
    { name: 'Piutang (Belum Bayar)', nominal: financials.unpaidReceivables, fill: '#D97706' }, // Kuning Primer
    { name: 'Uang Keluar (Belanja)', nominal: financials.totalExpenses, fill: '#DC2626' }, // Merah Primer
    { name: 'Keuntungan Bersih', nominal: Math.max(0, financials.netCash), fill: '#5C3A21' }, // Coklat Pudding
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
    <div className="min-h-screen bg-[#FAF8F5] text-[#141414] flex flex-col md:flex-row font-sans">
      {/* =====================================================================
          SIDEBAR NAVIGASI (COKLAT PUDDING, PUTIH, HITAM & WARNA PRIMER)
      ===================================================================== */}
      <aside className="w-full md:w-64 bg-white border-b md:border-b-0 md:border-r border-[#E6DFD5] p-5 flex flex-col justify-between shrink-0">
        <div>
          {/* Brand Logo */}
          <div className="flex items-center justify-between md:block mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#5C3A21] text-white flex items-center justify-center font-extrabold text-lg shadow-sm">
                M
              </div>
              <div>
                <h1 className="text-lg font-extrabold tracking-tight text-[#141414]">
                  MELPUD ADMIN
                </h1>
                <p className="text-xs text-[#786B5E] font-medium">
                  Consignment & Cash System
                </p>
              </div>
            </div>
          </div>

          {/* 5 Menu Halaman Utama */}
          <nav className="flex md:flex-col gap-1.5 overflow-x-auto pb-1 md:pb-0">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
                activeTab === 'dashboard'
                  ? 'bg-[#5C3A21] text-white shadow-sm'
                  : 'text-[#4A3F35] hover:bg-[#F3EFEA]'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </span>
            </button>

            <button
              onClick={() => setActiveTab('reports')}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
                activeTab === 'reports'
                  ? 'bg-[#5C3A21] text-white shadow-sm'
                  : 'text-[#4A3F35] hover:bg-[#F3EFEA]'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <BarChart3 className="w-4 h-4" />
                Laporan & Grafik
              </span>
            </button>

            <button
              onClick={() => setActiveTab('transactions')}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
                activeTab === 'transactions'
                  ? 'bg-[#5C3A21] text-white shadow-sm'
                  : 'text-[#4A3F35] hover:bg-[#F3EFEA]'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Receipt className="w-4 h-4" />
                Riwayat Transaksi
              </span>
            </button>

            <button
              onClick={() => setActiveTab('outlets-variants')}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
                activeTab === 'outlets-variants'
                  ? 'bg-[#5C3A21] text-white shadow-sm'
                  : 'text-[#4A3F35] hover:bg-[#F3EFEA]'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Store className="w-4 h-4" />
                Master Outlet & Varian
              </span>
            </button>

            <button
              onClick={() => setActiveTab('ai-validation')}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
                activeTab === 'ai-validation'
                  ? 'bg-[#141414] text-white shadow-sm'
                  : 'text-[#4A3F35] hover:bg-[#F3EFEA]'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4" />
                Validasi AI
              </span>
              {pendingAiLogs.length > 0 && (
                <span
                  className={`ml-2 px-2 py-0.5 text-[11px] font-bold rounded-full ${
                    activeTab === 'ai-validation'
                      ? 'bg-[#D97706] text-white'
                      : 'bg-amber-100 text-[#D97706]'
                  }`}
                >
                  {pendingAiLogs.length}
                </span>
              )}
            </button>
          </nav>
        </div>

        {/* Indikator Warna Fungsional */}
        <div className="hidden md:block pt-5 border-t border-[#E6DFD5] text-xs text-[#5A4E43] space-y-2">
          <p className="font-extrabold text-[#141414] uppercase tracking-wider text-[11px]">
            Kode Warna Aksi:
          </p>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#5C3A21] shrink-0" />
            <span>Coklat: Klik Kartu = Titip Pudding</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#1D4ED8] shrink-0" />
            <span>Biru: Cek Sisa / Retur Cup</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#15803D] shrink-0" />
            <span>Hijau: Lunas (PAID) / Uang Masuk</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#D97706] shrink-0" />
            <span>Kuning: Belum Bayar / Edit</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#DC2626] shrink-0" />
            <span>Merah: Belanja Bahan / Hapus</span>
          </div>
        </div>
      </aside>

      {/* =====================================================================
          MAIN CONTENT AREA
      ===================================================================== */}
      <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl mx-auto w-full space-y-6 pb-24">
        {/* ===================================================================
            HALAMAN 1: DASHBOARD UTAMA (METRIK KAS & 5 KARTU OUTLET INTERAKTIF)
            (Tanpa tombol +Titip Pudding & +Belanja Bahan di atas, dan tanpa grafik)
        =================================================================== */}
        {activeTab === 'dashboard' && (
          <>
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight text-[#141414]">
                Dashboard Operasional Melpud
              </h2>
              <p className="text-sm text-[#786B5E]">
                Klik langsung pada kartu outlet di bawah untuk menambahkan titipan pudding baru, atau cek sisa & ubah status pembayaran.
              </p>
            </div>

            {/* 4 KARTU METRIK UTAMA */}
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 1. Belum Dibayar / Piutang (Kuning/Amber Primer) */}
              <div className="bg-white p-5 rounded-2xl border-2 border-[#D97706]/30 shadow-sm">
                <div className="flex items-center justify-between text-[#D97706] mb-2">
                  <span className="text-xs font-extrabold uppercase tracking-wider">
                    Belum Dibayar (UNPAID)
                  </span>
                  <Clock className="w-4 h-4" />
                </div>
                <p className="text-2xl font-extrabold text-[#141414]">
                  {formatIDR(financials.unpaidReceivables)}
                </p>
                <p className="text-xs text-[#D97706] font-semibold mt-1">
                  Total piutang seluruh outlet
                </p>
              </div>

              {/* 2. Uang Masuk Lunas (Hijau Primer) */}
              <div className="bg-white p-5 rounded-2xl border-2 border-[#15803D]/30 shadow-sm">
                <div className="flex items-center justify-between text-[#15803D] mb-2">
                  <span className="text-xs font-extrabold uppercase tracking-wider">
                    Uang Masuk (PAID)
                  </span>
                  <TrendingUp className="w-4 h-4" />
                </div>
                <p className="text-2xl font-extrabold text-[#141414]">
                  {formatIDR(financials.realCashIn)}
                </p>
                <p className="text-xs text-[#15803D] font-semibold mt-1">
                  Kas penjualan sudah dibayar
                </p>
              </div>

              {/* 3. Uang Keluar Belanja Bahan (Merah Primer) */}
              <div className="bg-white p-5 rounded-2xl border-2 border-[#DC2626]/30 shadow-sm">
                <div className="flex items-center justify-between text-[#DC2626] mb-2">
                  <span className="text-xs font-extrabold uppercase tracking-wider">
                    Uang Keluar (Belanja)
                  </span>
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <p className="text-2xl font-extrabold text-[#141414]">
                  {formatIDR(financials.totalExpenses)}
                </p>
                <p className="text-xs text-[#DC2626] font-semibold mt-1">
                  Otomatis memotong kas penjualan
                </p>
              </div>

              {/* 4. Saldo Kas Bersih (Coklat Pudding) */}
              <div className="bg-[#5C3A21] text-white p-5 rounded-2xl shadow-sm">
                <div className="flex items-center justify-between text-amber-200 mb-2">
                  <span className="text-xs font-extrabold uppercase tracking-wider">
                    Saldo Kas Bersih
                  </span>
                  <Wallet className="w-4 h-4" />
                </div>
                <p className="text-2xl font-extrabold text-white">
                  {formatIDR(financials.netCash)}
                </p>
                <p className="text-xs text-amber-100/90 font-medium mt-1">
                  Proyeksi + Piutang: {formatIDR(financials.projectedProfit)}
                </p>
              </div>
            </section>

            {/* 5 KARTU OUTLET LANGSUNG DI DASHBOARD (KLIK KARTU = TAMBAH TITIP PUDDING) */}
            <section className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h3 className="text-base font-extrabold text-[#141414]">
                  Daftar Outlet Mitra ({outlets.length} Outlet)
                </h3>
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#5C3A21] bg-[#F3EFEA] px-3 py-1.5 rounded-xl">
                  <MousePointerClick className="w-3.5 h-3.5" />
                  Klik kartu outlet mana saja untuk menambahkan Titip Pudding
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {outlets.map((outlet) => {
                  const obatches = enrichedBatches.filter((b) => b.outlet_id === outlet.id);
                  const activeBatch = obatches.find((b) => b.status === 'ACTIVE');
                  const unpaidTotal = obatches
                    .filter((b) => b.status === 'RECONCILED' && b.payment_status === 'UNPAID')
                    .reduce((sum, b) => sum + b.total_bill, 0);

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
                      className="group bg-white border-2 border-[#E6DFD5] hover:border-[#5C3A21] rounded-2xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between gap-4"
                    >
                      <div>
                        {/* Outlet Header */}
                        <div className="flex items-start justify-between gap-3 border-b border-[#F3EFEA] pb-3 mb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-lg font-extrabold text-[#141414] group-hover:text-[#5C3A21] transition-colors">
                                {outlet.name}
                              </h4>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#F3EFEA] text-[#5C3A21] group-hover:bg-[#5C3A21] group-hover:text-white transition-colors">
                                Klik Kartu + Titip
                              </span>
                            </div>
                            <span className="text-xs text-[#786B5E]">
                              Kontak: {outlet.contact}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-[11px] text-[#786B5E] block">
                              Belum Dibayar (UNPAID):
                            </span>
                            <span
                              className={`text-base font-extrabold ${
                                unpaidTotal > 0 ? 'text-[#D97706]' : 'text-[#15803D]'
                              }`}
                            >
                              {unpaidTotal > 0 ? formatIDR(unpaidTotal) : 'Rp 0 (Lunas)'}
                            </span>
                          </div>
                        </div>

                        {/* Tombol Aksi Cepat (Cek Sisa & Lunasi Semua) - Tanpa tombol +Titip Pudding */}
                        {(activeBatch || unpaidTotal > 0) && (
                          <div
                            className="flex flex-wrap gap-2 mb-4"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {/* Biru Primer: Cek Sisa / Retur */}
                            {activeBatch && (
                              <button
                                type="button"
                                onClick={() => {
                                  setReconcileModal(activeBatch);
                                  setReconcileForm({ qtyReturned: 2, paidNow: false });
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-[#1D4ED8] text-white hover:bg-blue-800"
                              >
                                <RotateCcw className="w-3.5 h-3.5" /> Cek Sisa ({activeBatch.qty_drop} cup)
                              </button>
                            )}

                            {/* Hijau Primer: Lunasi Semua */}
                            {unpaidTotal > 0 && (
                              <button
                                type="button"
                                onClick={() => handleSettleAllOutlet(outlet.id)}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-[#15803D] text-white hover:bg-green-800"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" /> Lunasi Semua
                              </button>
                            )}
                          </div>
                        )}

                        {/* Riwayat Tanggal di Outlet Ini */}
                        <div
                          className="space-y-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="text-xs font-bold text-[#786B5E] uppercase tracking-wider block">
                            Riwayat Tanggal Penitipan ({obatches.length}):
                          </span>
                          {obatches.length === 0 ? (
                            <p className="text-xs text-[#786B5E] italic py-2">
                              Belum ada riwayat penitipan. Klik kartu ini untuk menitipkan pudding.
                            </p>
                          ) : (
                            <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                              {obatches.map((b) => (
                                <div
                                  key={b.id}
                                  className="p-3 rounded-xl bg-[#FAF8F5] border border-[#E6DFD5] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                                >
                                  <div>
                                    <div className="font-extrabold text-[#141414]">
                                      {b.date} • {b.product_name}
                                    </div>
                                    <div className="text-[#5A4E43] mt-0.5">
                                      {b.status === 'ACTIVE' ? (
                                        <span className="text-[#1D4ED8] font-bold">
                                          Titip {b.qty_drop} cup (Sedang Dititip)
                                        </span>
                                      ) : (
                                        <span>
                                          Titip {b.qty_drop} •{' '}
                                          <strong className="text-[#1D4ED8]">
                                            Sisa {b.qty_returned}
                                          </strong>{' '}
                                          • Laku {b.qty_sold} ={' '}
                                          <strong>{formatIDR(b.total_bill)}</strong>
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1.5 shrink-0">
                                    {b.status === 'ACTIVE' ? (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setReconcileModal(b);
                                          setReconcileForm({ qtyReturned: 2, paidNow: false });
                                        }}
                                        className="px-2.5 py-1 rounded-lg bg-[#1D4ED8] text-white font-bold"
                                      >
                                        Input Sisa
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => handleTogglePaymentStatus(b)}
                                        className={`px-2.5 py-1 rounded-lg font-bold ${
                                          b.payment_status === 'PAID'
                                            ? 'bg-emerald-100 text-[#15803D]'
                                            : 'bg-amber-100 text-[#D97706]'
                                        }`}
                                      >
                                        {b.payment_status === 'PAID'
                                          ? 'PAID (Lunas)'
                                          : 'UNPAID (Klik Lunasi)'}
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
                                      className="p-1.5 rounded-lg bg-amber-50 text-[#D97706] border border-amber-200"
                                      title="Edit"
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
                                      className="p-1.5 rounded-lg bg-red-50 text-[#DC2626] border border-red-200"
                                      title="Hapus"
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
              <h2 className="text-2xl font-extrabold tracking-tight text-[#141414]">
                Laporan Keuangan & Diagram Analitik
              </h2>
              <p className="text-sm text-[#786B5E]">
                Visualisasi lengkap pemasukan penjualan, piutang belum dibayar, pengeluaran belanja bahan, dan performa per outlet.
              </p>
            </div>

            {/* Ringkasan Laba Rugi */}
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-[#E6DFD5] shadow-sm">
                <span className="text-xs font-extrabold uppercase text-[#15803D]">
                  Total Uang Masuk (PAID)
                </span>
                <p className="text-2xl font-extrabold text-[#141414] mt-1">
                  {formatIDR(financials.realCashIn)}
                </p>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-[#E6DFD5] shadow-sm">
                <span className="text-xs font-extrabold uppercase text-[#D97706]">
                  Total Belum Dibayar (UNPAID)
                </span>
                <p className="text-2xl font-extrabold text-[#141414] mt-1">
                  {formatIDR(financials.unpaidReceivables)}
                </p>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-[#E6DFD5] shadow-sm">
                <span className="text-xs font-extrabold uppercase text-[#DC2626]">
                  Total Belanja Bahan
                </span>
                <p className="text-2xl font-extrabold text-[#141414] mt-1">
                  {formatIDR(financials.totalExpenses)}
                </p>
              </div>
              <div className="bg-[#5C3A21] text-white p-5 rounded-2xl shadow-sm">
                <span className="text-xs font-extrabold uppercase text-amber-200">
                  Keuntungan Kas Bersih
                </span>
                <p className="text-2xl font-extrabold text-white mt-1">
                  {formatIDR(financials.netCash)}
                </p>
              </div>
            </section>

            {/* Diagram Batang & Donat */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white border border-[#E6DFD5] rounded-2xl p-5 shadow-sm">
                <div className="mb-4">
                  <h3 className="text-sm font-extrabold text-[#141414]">
                    Diagram Pemasukan, Pengeluaran & Keuntungan
                  </h3>
                  <p className="text-xs text-[#786B5E]">
                    Perbandingan kas masuk lunas, piutang belum dibayar, belanja bahan, dan kas bersih
                  </p>
                </div>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barChartData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F3EFEA" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#4A3F35' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#786B5E' }} />
                      <Tooltip formatter={(val) => formatIDR(val)} />
                      <Bar dataKey="nominal" radius={[8, 8, 0, 0]}>
                        {barChartData.map((entry, idx) => (
                          <Cell key={`bar-${idx}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white border border-[#E6DFD5] rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-extrabold text-[#141414]">
                    Diagram Komposisi Belanja
                  </h3>
                  <p className="text-xs text-[#786B5E]">
                    Proporsi pengeluaran bahan baku & kemasan
                  </p>
                </div>

                {pieChartData.length === 0 ? (
                  <div className="h-52 flex items-center justify-center text-xs text-[#786B5E]">
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
                          innerRadius={45}
                          outerRadius={75}
                          paddingAngle={4}
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

                <div className="space-y-1.5 text-xs pt-2 border-t border-[#F3EFEA]">
                  {pieChartData.map((item) => (
                    <div key={item.name} className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-[#4A3F35] font-medium">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        {item.name}
                      </span>
                      <span className="font-extrabold text-[#141414]">{formatIDR(item.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Tabel Rekapitulasi Performa Per Outlet */}
            <section className="bg-white border border-[#E6DFD5] rounded-2xl overflow-hidden shadow-sm">
              <div className="p-5 border-b border-[#F3EFEA]">
                <h3 className="text-sm font-extrabold text-[#141414]">
                  Laporan Rekapitulasi Penjualan & Piutang per Outlet
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAF8F5] text-[#786B5E] uppercase border-b border-[#E6DFD5]">
                    <tr>
                      <th className="px-4 py-3.5">Nama Outlet</th>
                      <th className="px-4 py-3.5">Total Cup Titip</th>
                      <th className="px-4 py-3.5">Total Sisa / Retur</th>
                      <th className="px-4 py-3.5">Total Cup Terjual</th>
                      <th className="px-4 py-3.5">Sudah Dibayar (PAID)</th>
                      <th className="px-4 py-3.5">Belum Dibayar (UNPAID)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F3EFEA]">
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
                        <tr key={o.id} className="hover:bg-[#FAF8F5]">
                          <td className="px-4 py-3.5 font-extrabold text-[#141414]">{o.name}</td>
                          <td className="px-4 py-3.5 font-bold">{totalDrop} cup</td>
                          <td className="px-4 py-3.5 text-[#1D4ED8] font-bold">{totalRet} cup</td>
                          <td className="px-4 py-3.5 font-bold">{totalSold} cup</td>
                          <td className="px-4 py-3.5 font-extrabold text-[#15803D]">
                            {formatIDR(paidAmt)}
                          </td>
                          <td className="px-4 py-3.5 font-extrabold text-[#D97706]">
                            {formatIDR(unpaidAmt)}
                          </td>
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
                <h2 className="text-2xl font-extrabold tracking-tight text-[#141414]">
                  Master Data Outlet & Varian Pudding
                </h2>
                <p className="text-sm text-[#786B5E]">
                  Tambah varian rasa baru beserta harganya (default: Pudding Coklat Rp 5.000) atau kelola daftar outlet mitra.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setNewOutletModal(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-white border border-[#5C3A21] text-[#5C3A21] hover:bg-[#F3EFEA]"
                >
                  <Plus className="w-4 h-4" /> + Outlet Baru
                </button>
                <button
                  onClick={() => {
                    setVariantForm({ id: null, name: '', price: '5000' });
                    setVariantModal(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#5C3A21] text-white hover:bg-[#4A2E1B]"
                >
                  <Plus className="w-4 h-4" /> + Varian Pudding
                </button>
              </div>
            </div>

            {/* KATALOG VARIAN PUDDING & HARGA */}
            <section className="bg-white border border-[#E6DFD5] rounded-2xl p-6 shadow-sm space-y-4">
              <div>
                <h3 className="text-base font-extrabold text-[#141414]">
                  Katalog Varian Pudding & Harga Satuan
                </h3>
                <p className="text-xs text-[#786B5E]">
                  Harga varian otomatis diambil saat Anda menitipkan pudding di kartu outlet.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {products.map((prod) => (
                  <div
                    key={prod.id}
                    className="p-4 rounded-xl border border-[#E6DFD5] bg-[#FAF8F5] flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-[#5C3A21]" />
                        <h4 className="font-extrabold text-sm text-[#141414]">{prod.name}</h4>
                      </div>
                      <p className="text-base font-extrabold text-[#5C3A21] mt-1">
                        {formatIDR(prod.price)} <span className="text-xs font-normal">/ cup</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setVariantForm({
                            id: prod.id,
                            name: prod.name,
                            price: String(prod.price),
                          });
                          setVariantModal(true);
                        }}
                        className="p-2 rounded-lg bg-amber-50 text-[#D97706] border border-amber-200 hover:bg-amber-100"
                        title="Edit Varian"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      {products.length > 1 && (
                        <button
                          onClick={() =>
                            setDeleteDialog({
                              type: 'product',
                              id: prod.id,
                              title: `Varian ${prod.name}`,
                            })
                          }
                          className="p-2 rounded-lg bg-red-50 text-[#DC2626] border border-red-200 hover:bg-red-100"
                          title="Hapus Varian"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* DAFTAR MASTER OUTLET */}
            <section className="bg-white border border-[#E6DFD5] rounded-2xl p-6 shadow-sm space-y-4">
              <div>
                <h3 className="text-base font-extrabold text-[#141414]">
                  Daftar Master Outlet Mitra ({outlets.length})
                </h3>
                <p className="text-xs text-[#786B5E]">
                  Daftar outlet aktif yang tampil di halaman Dashboard utama.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {outlets.map((o) => (
                  <div
                    key={o.id}
                    className="p-4 rounded-xl border border-[#E6DFD5] bg-[#FAF8F5] flex items-center justify-between"
                  >
                    <div>
                      <h4 className="font-extrabold text-sm text-[#141414]">{o.name}</h4>
                      <p className="text-xs text-[#786B5E] mt-0.5">Kontak: {o.contact}</p>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-[#15803D]">
                      Aktif
                    </span>
                  </div>
                ))}
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
                <h2 className="text-2xl font-extrabold tracking-tight text-[#141414]">
                  Riwayat Seluruh Transaksi (Uang Masuk & Uang Keluar)
                </h2>
                <p className="text-sm text-[#786B5E]">
                  Daftar lengkap seluruh pemasukan penjualan pudding, piutang belum dibayar, dan pengeluaran belanja bahan.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setExpenseModal(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#DC2626] text-white hover:bg-red-700"
                >
                  <ShoppingBag className="w-4 h-4" /> + Catat Belanja Bahan
                </button>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white border border-[#E6DFD5] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setTxFilter('ALL')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                    txFilter === 'ALL'
                      ? 'bg-[#141414] text-white'
                      : 'bg-[#FAF8F5] text-[#4A3F35] hover:bg-[#F3EFEA]'
                  }`}
                >
                  Semua Transaksi ({unifiedTransactions.length})
                </button>
                <button
                  onClick={() => setTxFilter('CASH_IN')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                    txFilter === 'CASH_IN'
                      ? 'bg-[#15803D] text-white'
                      : 'bg-emerald-50 text-[#15803D] hover:bg-emerald-100'
                  }`}
                >
                  Uang Masuk / PAID
                </button>
                <button
                  onClick={() => setTxFilter('UNPAID')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                    txFilter === 'UNPAID'
                      ? 'bg-[#D97706] text-white'
                      : 'bg-amber-50 text-[#D97706] hover:bg-amber-100'
                  }`}
                >
                  Belum Dibayar / Aktif
                </button>
                <button
                  onClick={() => setTxFilter('EXPENSE')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                    txFilter === 'EXPENSE'
                      ? 'bg-[#DC2626] text-white'
                      : 'bg-red-50 text-[#DC2626] hover:bg-red-100'
                  }`}
                >
                  Uang Keluar (Belanja Bahan)
                </button>
              </div>

              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-[#786B5E]" />
                <select
                  value={txOutletFilter}
                  onChange={(e) => setTxOutletFilter(e.target.value)}
                  className="text-xs border border-[#E6DFD5] rounded-xl px-3 py-2 bg-[#FAF8F5] font-bold"
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
            <div className="bg-white border border-[#E6DFD5] rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAF8F5] text-[#786B5E] uppercase border-b border-[#E6DFD5]">
                    <tr>
                      <th className="px-4 py-3.5">Tanggal</th>
                      <th className="px-4 py-3.5">Tipe Arus</th>
                      <th className="px-4 py-3.5">Keterangan / Outlet</th>
                      <th className="px-4 py-3.5">Status</th>
                      <th className="px-4 py-3.5">Nominal</th>
                      <th className="px-4 py-3.5 text-right">Aksi CRUD</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F3EFEA]">
                    {filteredTransactions.map((item) => (
                      <tr key={`${item.txType}-${item.id}`} className="hover:bg-[#FAF8F5]">
                        <td className="px-4 py-3.5 font-bold text-[#141414] whitespace-nowrap">
                          {item.date}
                        </td>
                        <td className="px-4 py-3.5">
                          {item.txType === 'EXPENSE' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-50 text-[#DC2626] font-bold">
                              <ArrowUpRight className="w-3.5 h-3.5" /> Uang Keluar
                            </span>
                          ) : item.status === 'PAID' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-[#15803D] font-bold">
                              <ArrowDownLeft className="w-3.5 h-3.5" /> Uang Masuk
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-[#D97706] font-bold">
                              <Clock className="w-3.5 h-3.5" /> Konsinyasi
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="font-extrabold text-[#141414]">{item.title}</div>
                          <div className="text-[#786B5E]">{item.subtitle}</div>
                        </td>
                        <td className="px-4 py-3.5">
                          {item.status === 'EXPENSE' && (
                            <span className="px-2.5 py-0.5 rounded-full bg-red-100 text-[#DC2626] font-bold text-[11px]">
                              POTONG KAS
                            </span>
                          )}
                          {item.status === 'PAID' && (
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-[#15803D] font-bold text-[11px]">
                              PAID (Lunas)
                            </span>
                          )}
                          {item.status === 'UNPAID' && (
                            <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-[#D97706] font-bold text-[11px]">
                              UNPAID (Belum Bayar)
                            </span>
                          )}
                          {item.status === 'ACTIVE' && (
                            <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-[#1D4ED8] font-bold text-[11px]">
                              ACTIVE (Dititip)
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 font-extrabold whitespace-nowrap">
                          {item.txType === 'EXPENSE' ? (
                            <span className="text-[#DC2626]">-{formatIDR(item.amount)}</span>
                          ) : item.status === 'ACTIVE' ? (
                            <span className="text-[#786B5E]">Menunggu Sisa</span>
                          ) : (
                            <span
                              className={
                                item.status === 'PAID' ? 'text-[#15803D]' : 'text-[#D97706]'
                              }
                            >
                              +{formatIDR(item.amount)}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            {item.txType === 'CONSIGNMENT' && item.status === 'ACTIVE' && (
                              <button
                                onClick={() => {
                                  setReconcileModal(item.raw);
                                  setReconcileForm({ qtyReturned: 2, paidNow: false });
                                }}
                                className="px-2.5 py-1 rounded-lg bg-[#1D4ED8] text-white font-bold"
                              >
                                Input Sisa
                              </button>
                            )}

                            {item.txType === 'CONSIGNMENT' && item.status !== 'ACTIVE' && (
                              <button
                                onClick={() => handleTogglePaymentStatus(item.raw)}
                                className={`px-2.5 py-1 rounded-lg font-bold ${
                                  item.status === 'UNPAID'
                                    ? 'bg-[#15803D] text-white'
                                    : 'bg-amber-100 text-[#D97706]'
                                }`}
                              >
                                {item.status === 'UNPAID' ? 'Lunasi' : 'Set Unpaid'}
                              </button>
                            )}

                            {/* Edit Button (Kuning Primer) */}
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
                              className="p-1.5 rounded-lg bg-amber-50 text-[#D97706] border border-amber-200"
                              title="Edit"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete Button (Merah Primer) */}
                            <button
                              onClick={() =>
                                setDeleteDialog({
                                  type: item.txType === 'CONSIGNMENT' ? 'batch' : 'expense',
                                  id: item.id,
                                  title: item.title,
                                })
                              }
                              className="p-1.5 rounded-lg bg-red-50 text-[#DC2626] border border-red-200"
                              title="Hapus"
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
            <div className="bg-white border border-[#E6DFD5] rounded-2xl p-6 shadow-sm">
              <div className="inline-flex items-center gap-1.5 text-[#5C3A21] text-xs font-extrabold uppercase tracking-wider mb-1">
                <Sparkles className="w-4 h-4" /> Halaman Validasi AI
              </div>
              <h2 className="text-2xl font-extrabold tracking-tight text-[#141414]">
                Daftar Chat yang Belum Dipelajari oleh AI
              </h2>
              <p className="text-sm text-[#786B5E] mt-1">
                Setiap ada perintah baru di chat AI pojok kanan bawah yang belum dikenali, otomatis masuk ke daftar ini dengan status{' '}
                <strong className="text-[#141414]">&ldquo;Perintah sedang dipelajari&rdquo;</strong>. Klik{' '}
                <strong className="text-[#DC2626]">Hapus</strong> jika di luar cakupan bisnis Melpud.
              </p>
            </div>

            <section className="space-y-3">
              <h3 className="text-sm font-extrabold text-[#141414]">
                Antrean Chat Belum Dipelajari ({pendingAiLogs.length})
              </h3>

              {pendingAiLogs.length === 0 ? (
                <div className="bg-white border border-[#E6DFD5] rounded-2xl p-8 text-center text-sm text-[#786B5E]">
                  Tidak ada antrean chat baru. Semua perintah sudah dipelajari atau dihapus.
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingAiLogs.map((item) => (
                    <div
                      key={item.id}
                      className="bg-white border border-[#E6DFD5] rounded-2xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-sm"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-[#D97706]">
                            Perintah sedang dipelajari
                          </span>
                          <span className="text-xs text-[#786B5E]">{item.created_at}</span>
                        </div>
                        <p className="text-base font-extrabold text-[#141414]">
                          &ldquo;{item.raw_text}&rdquo;
                        </p>
                        <p className="text-xs text-[#786B5E]">{item.ai_reason}</p>
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
                          className="px-3 py-2 text-xs font-bold bg-[#FAF8F5] border border-[#E6DFD5] rounded-xl"
                        >
                          <option value="CREATE_DROP">Pelajari: Titip Pudding</option>
                          <option value="RECONCILE_BATCH">Pelajari: Cek Sisa / Retur</option>
                          <option value="SETTLE_PAYMENT">Pelajari: Pelunasan PAID</option>
                          <option value="RECORD_EXPENSE">Pelajari: Belanja Bahan</option>
                        </select>

                        {/* Validasi = Hijau Primer */}
                        <button
                          onClick={() => handleValidateAiLog(item.id)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#15803D] text-white hover:bg-green-800 transition"
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
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#DC2626] text-white hover:bg-red-700 transition"
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
              <section className="space-y-3 pt-4 border-t border-[#E6DFD5]">
                <h3 className="text-sm font-extrabold text-[#4A3F35]">
                  Perintah yang Sudah Dipelajari ({learnedAiLogs.length})
                </h3>
                <div className="bg-white border border-[#E6DFD5] rounded-2xl divide-y divide-[#F3EFEA]">
                  {learnedAiLogs.map((l) => (
                    <div
                      key={l.id}
                      className="p-4 flex items-center justify-between gap-3"
                    >
                      <div>
                        <p className="text-sm font-bold text-[#141414]">
                          &ldquo;{l.raw_text}&rdquo;
                        </p>
                        <span className="text-xs text-[#15803D] font-bold">
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
                        className="p-2 rounded-lg bg-red-50 text-[#DC2626] border border-red-200 hover:bg-red-100"
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
          <div className="mb-3 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-[#E6DFD5] overflow-hidden flex flex-col">
            {/* Header Chat WA Style */}
            <div className="bg-[#5C3A21] text-white px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-extrabold text-sm">
                  AI
                </div>
                <div>
                  <h4 className="text-sm font-extrabold leading-tight">Melpud AI Chat</h4>
                  <span className="text-[11px] text-emerald-300 flex items-center gap-1">
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
            <div className="h-80 overflow-y-auto p-3.5 space-y-2.5 bg-[#EFEAE2]">
              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    msg.sender === 'user' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div
                    className={`max-w-[82%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed shadow-sm ${
                      msg.sender === 'user'
                        ? 'bg-[#5C3A21] text-white rounded-br-none'
                        : msg.isLearning
                        ? 'bg-amber-50 text-[#141414] border border-[#D97706] rounded-bl-none'
                        : 'bg-white text-[#141414] rounded-bl-none'
                    }`}
                  >
                    <p>{msg.text}</p>
                    <span
                      className={`block text-[10px] mt-1 text-right ${
                        msg.sender === 'user' ? 'text-amber-100/80' : 'text-[#786B5E]'
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
              className="p-2.5 bg-white border-t border-[#E6DFD5] flex items-center gap-2"
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ketik pesan perintah..."
                className="flex-1 px-3.5 py-2 text-xs bg-[#FAF8F5] border border-[#E6DFD5] rounded-full focus:outline-none focus:border-[#5C3A21]"
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
          className="h-14 px-5 rounded-full bg-[#5C3A21] hover:bg-[#4A2E1B] text-white shadow-xl flex items-center gap-2.5 font-extrabold text-xs transition-transform active:scale-95"
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
            className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border-t-4 border-[#5C3A21]"
          >
            <div className="flex items-center gap-2 text-[#5C3A21] font-extrabold">
              <PlusCircle className="w-5 h-5" />
              <h3>Titip Pudding ke Outlet</h3>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#4A3F35] mb-1">
                Pilih Outlet
              </label>
              <select
                value={dropModal.outletId}
                onChange={(e) => setDropModal({ ...dropModal, outletId: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#E6DFD5] rounded-xl"
              >
                {outlets.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#4A3F35] mb-1">
                Varian Pudding
              </label>
              <select
                value={dropForm.productId}
                onChange={(e) => setDropForm({ ...dropForm, productId: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#E6DFD5] rounded-xl"
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
                <label className="block text-xs font-bold text-[#4A3F35] mb-1">
                  Jumlah Cup
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={dropForm.qty}
                  onChange={(e) => setDropForm({ ...dropForm, qty: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-[#E6DFD5] rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#4A3F35] mb-1">
                  Tanggal
                </label>
                <input
                  type="date"
                  value={dropForm.date}
                  onChange={(e) => setDropForm({ ...dropForm, date: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-[#E6DFD5] rounded-xl"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDropModal({ open: false, outletId: 'p-bungin' })}
                className="px-4 py-2 text-xs font-bold text-[#4A3F35] bg-[#FAF8F5] rounded-xl"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold text-white bg-[#5C3A21] hover:bg-[#4A2E1B] rounded-xl"
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
            className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border-t-4 border-[#1D4ED8]"
          >
            <div className="flex items-center gap-2 text-[#1D4ED8] font-extrabold">
              <RotateCcw className="w-5 h-5" />
              <h3>Cek Sisa Cup & Status Pembayaran</h3>
            </div>
            <p className="text-xs text-[#5A4E43]">
              Outlet: <strong>{reconcileModal.outlet_name}</strong> • Titip Awal:{' '}
              <strong>{reconcileModal.qty_drop} cup</strong> ({reconcileModal.product_name})
            </p>
            <div>
              <label className="block text-xs font-bold text-[#4A3F35] mb-1">
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
                className="w-full px-3 py-2 text-sm border border-[#E6DFD5] rounded-xl"
              />
            </div>
            <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-950 space-y-1">
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
                className="px-4 py-2 text-xs font-bold text-[#4A3F35] bg-[#FAF8F5] rounded-xl"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold text-white bg-[#1D4ED8] hover:bg-blue-800 rounded-xl"
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
            className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border-t-4 border-[#D97706]"
          >
            <div className="flex items-center gap-2 text-[#D97706] font-extrabold">
              <Pencil className="w-5 h-5" />
              <h3>Edit Data Titipan ({editBatchModal.outlet_name})</h3>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#4A3F35] mb-1">
                Jumlah Cup Titip
              </label>
              <input
                type="number"
                min={1}
                value={editBatchForm.qty_drop}
                onChange={(e) =>
                  setEditBatchForm({ ...editBatchForm, qty_drop: e.target.value })
                }
                className="w-full px-3 py-2 text-sm border border-[#E6DFD5] rounded-xl"
              />
            </div>
            {editBatchModal.status === 'RECONCILED' && (
              <div>
                <label className="block text-xs font-bold text-[#4A3F35] mb-1">
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
                  className="w-full px-3 py-2 text-sm border border-[#E6DFD5] rounded-xl"
                />
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditBatchModal(null)}
                className="px-4 py-2 text-xs font-bold text-[#4A3F35] bg-[#FAF8F5] rounded-xl"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold text-white bg-[#D97706] hover:bg-amber-700 rounded-xl"
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
            className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border-t-4 border-[#DC2626]"
          >
            <div className="flex items-center gap-2 text-[#DC2626] font-extrabold">
              <ShoppingBag className="w-5 h-5" />
              <h3>Catat Belanja Bahan (Uang Keluar)</h3>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#4A3F35] mb-1">
                Kategori Pengeluaran
              </label>
              <select
                value={expenseForm.category}
                onChange={(e) =>
                  setExpenseForm({ ...expenseForm, category: e.target.value })
                }
                className="w-full px-3 py-2 text-sm border border-[#E6DFD5] rounded-xl"
              >
                <option value="Bahan Baku Utama">Bahan Baku Utama</option>
                <option value="Kemasan">Kemasan</option>
                <option value="Operasional Lainnya">Operasional Lainnya</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#4A3F35] mb-1">
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
                className="w-full px-3 py-2 text-sm border border-[#E6DFD5] rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#4A3F35] mb-1">
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
                className="w-full px-3 py-2 text-sm border border-[#E6DFD5] rounded-xl"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setExpenseModal(false)}
                className="px-4 py-2 text-xs font-bold text-[#4A3F35] bg-[#FAF8F5] rounded-xl"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold text-white bg-[#DC2626] hover:bg-red-700 rounded-xl"
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
            className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border-t-4 border-[#D97706]"
          >
            <div className="flex items-center gap-2 text-[#D97706] font-extrabold">
              <Pencil className="w-5 h-5" />
              <h3>Edit Catatan Belanja</h3>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#4A3F35] mb-1">
                Kategori
              </label>
              <select
                value={editExpenseForm.category}
                onChange={(e) =>
                  setEditExpenseForm({ ...editExpenseForm, category: e.target.value })
                }
                className="w-full px-3 py-2 text-sm border border-[#E6DFD5] rounded-xl"
              >
                <option value="Bahan Baku Utama">Bahan Baku Utama</option>
                <option value="Kemasan">Kemasan</option>
                <option value="Operasional Lainnya">Operasional Lainnya</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#4A3F35] mb-1">
                Keterangan Barang
              </label>
              <input
                type="text"
                required
                value={editExpenseForm.description}
                onChange={(e) =>
                  setEditExpenseForm({ ...editExpenseForm, description: e.target.value })
                }
                className="w-full px-3 py-2 text-sm border border-[#E6DFD5] rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#4A3F35] mb-1">
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
                className="w-full px-3 py-2 text-sm border border-[#E6DFD5] rounded-xl"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditExpenseModal(null)}
                className="px-4 py-2 text-xs font-bold text-[#4A3F35] bg-[#FAF8F5] rounded-xl"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold text-white bg-[#D97706] hover:bg-amber-700 rounded-xl"
              >
                Update Belanja
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 6: TAMBAH OUTLET BARU (COKLAT) */}
      {newOutletModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <form
            onSubmit={handleAddOutlet}
            className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border-t-4 border-[#5C3A21]"
          >
            <div className="flex items-center gap-2 text-[#5C3A21] font-extrabold">
              <Store className="w-5 h-5" />
              <h3>Tambah Outlet Mitra Baru</h3>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#4A3F35] mb-1">
                Nama Outlet
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: P. TANJUNG"
                value={newOutletForm.name}
                onChange={(e) =>
                  setNewOutletForm({ ...newOutletForm, name: e.target.value })
                }
                className="w-full px-3 py-2 text-sm border border-[#E6DFD5] rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#4A3F35] mb-1">
                Nomor Kontak / WA
              </label>
              <input
                type="text"
                placeholder="0812-xxxx-xxxx"
                value={newOutletForm.contact}
                onChange={(e) =>
                  setNewOutletForm({ ...newOutletForm, contact: e.target.value })
                }
                className="w-full px-3 py-2 text-sm border border-[#E6DFD5] rounded-xl"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setNewOutletModal(false)}
                className="px-4 py-2 text-xs font-bold text-[#4A3F35] bg-[#FAF8F5] rounded-xl"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold text-white bg-[#5C3A21] hover:bg-[#4A2E1B] rounded-xl"
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
            className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border-t-4 border-[#5C3A21]"
          >
            <div className="flex items-center gap-2 text-[#5C3A21] font-extrabold">
              <Plus className="w-5 h-5" />
              <h3>{variantForm.id ? 'Edit Varian Pudding' : 'Tambah Varian Pudding Baru'}</h3>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#4A3F35] mb-1">
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
                className="w-full px-3 py-2 text-sm border border-[#E6DFD5] rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#4A3F35] mb-1">
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
                className="w-full px-3 py-2 text-sm border border-[#E6DFD5] rounded-xl"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setVariantModal(false)}
                className="px-4 py-2 text-xs font-bold text-[#4A3F35] bg-[#FAF8F5] rounded-xl"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold text-white bg-[#5C3A21] hover:bg-[#4A2E1B] rounded-xl"
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
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-xl border-t-4 border-[#DC2626]">
            <div className="flex items-center gap-2 text-[#DC2626] font-extrabold">
              <Trash2 className="w-5 h-5" />
              <h3>Konfirmasi Hapus</h3>
            </div>
            <p className="text-xs text-[#4A3F35]">
              Apakah Anda yakin ingin menghapus data berikut secara permanen:{' '}
              <strong className="text-[#141414]">{deleteDialog.title}</strong>?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteDialog(null)}
                className="px-4 py-2 text-xs font-bold text-[#4A3F35] bg-[#FAF8F5] rounded-xl"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDeleteAction}
                className="px-4 py-2 text-xs font-bold text-white bg-[#DC2626] hover:bg-red-700 rounded-xl"
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