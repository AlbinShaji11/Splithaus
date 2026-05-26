from typing import List, Optional

from pydantic import BaseModel


class ReceiptItem(BaseModel):
    id: str
    name: str
    quantity: float
    unit_price: float
    total_price: float
    category: str
    confidence: float


class ReceiptScanResponse(BaseModel):
    store_name: str
    receipt_date: Optional[str] = None
    items: List[ReceiptItem]
    subtotal: float
    gst: float
    total: float
    currency: str = "AUD"
    warnings: List[str]


class ScanReceiptRequest(BaseModel):
    pass
