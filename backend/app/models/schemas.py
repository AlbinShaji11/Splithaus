from pydantic import BaseModel
from typing import Optional


class ReceiptItem(BaseModel):
    name: str
    price: float
    type: str  # "item" or "discount"


class ReceiptScanResponse(BaseModel):
    store: str
    items: list[ReceiptItem]
    subtotal: float
    gst: float
    total: float
    line_count: int
    warnings: list[str]
