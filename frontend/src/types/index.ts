export type SplitMode = 'everyone' | 'individual' | 'subset' | 'proportion' | 'custom'

export interface Person {
  id: string
  name: string
  color: string
  initial: string
}

export interface ProportionShare {
  personId: string
  ratio: number
}

export interface ItemSplit {
  itemIndex: number
  mode: SplitMode
  assignedTo: string[]
  proportions?: ProportionShare[]
  customAmounts?: Record<string, number>
}

export interface ReceiptItem {
  name: string
  price: number
  type: 'item' | 'discount'
  linkedItemIndex?: number | null  // Costco discounts: index of matched item
}

export interface ScannedReceipt {
  store: string
  items: ReceiptItem[]
  subtotal: number
  gst: number
  total: number
  line_count: number
  warnings: string[]
}

export interface Settlement {
  fromId: string
  fromName: string
  toId: string
  toName: string
  amount: number
}
