type PublicmOutlets = {
  id: string
  name: string
  contact: string | null
  status: "active" | null
}

type PublicmProducts = {
  id: string
  name: string
  price: number
}

type PublicmConsignmentBatches = {
  id: string
  date: string
  outlet_id: string
  product_id: string
  product_name: string
  qty_drop: number
  qty_returned: number
  price_unit: number
  status: "ACTIVE" | "RECONCILED" | null
  payment_status: "UNPAID" | "PAID" | null
  paid_at: string | null
}

type PublicmExpenses = {
  id: string
  date: string
  category: "Bahan Baku Utama" | "Kemasan" | "Operasional Lainnya"
  description: string | null
  amount: number
}

type PublicmFinancialSummary = {
  total_kas_masuk: number
  total_piutang: number
  total_belanja: number
  saldo_kas_bersih: number
}

export type {
  PublicmOutlets,
  PublicmProducts,
  PublicmConsignmentBatches,
  PublicmExpenses,
  PublicmFinancialSummary
}