
from pydantic import BaseModel


class ReceiptItem(BaseModel):
    name: str
    price: float
    type: str  # "item" or "discount"
    linked_item_index: int | None = None  # Costco discounts: index of matched item in the list


class ReceiptScanResponse(BaseModel):
    store: str
    items: list[ReceiptItem]
    subtotal: float
    gst: float
    total: float
    line_count: int
    warnings: list[str]
