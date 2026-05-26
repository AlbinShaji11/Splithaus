export type SplitCode = 'ALL' | 'CUSTOM' | string

export interface Person {
  id: string
  name: string
  color: string
}

export interface ReceiptItem {
  id: string
  name: string
  quantity: number
  unitPrice: number
  totalPrice: number
  category: string
  confidence: number
  splitCode: SplitCode
  assignedTo: string[]
  customAmounts?: Record<string, number>
}

export interface Receipt {
  id: string
  storeName: string
  receiptDate: string | null
  items: ReceiptItem[]
  subtotal: number
  gst: number
  total: number
  paidBy: string | null
  scannedAt: string
}

export interface Balance {
  personId: string
  name: string
  color: string
  totalOwes: number
  totalOwed: number
  net: number
}

export interface Settlement {
  from: string
  fromName: string
  to: string
  toName: string
  amount: number
}

export interface SplitSession {
  id: string
  receipt: Receipt
  people: Person[]
  balances: Balance[]
  settlements: Settlement[]
  createdAt: string
  isSettled: boolean
}

export type AppState = {
  currentReceipt: Receipt | null
  people: Person[]
  sessions: SplitSession[]
  isScanning: boolean
  scanError: string | null
}
