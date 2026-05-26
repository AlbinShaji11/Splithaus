import re
import uuid
from typing import Optional

from app.models.schemas import ReceiptItem, ReceiptScanResponse

_ALCOHOL = {
    "beer", "wine", "spirits", "cider", "vodka", "whisky", "rum", "gin", "lager", "champagne"
}
_CLEANING = {"detergent", "bleach", "spray", "mop", "sponge", "dishwash", "cleaner", "laundry"}
_PERSONAL = {"shampoo", "conditioner", "soap", "deodorant", "razor", "toothpaste", "moisturiser"}
_HOUSEHOLD = {"paper", "tissue", "towel", "trash", "bag", "bin", "candle", "battery", "batteries"}

_SUFFIX_RE = re.compile(r"\b(WW|CW|PKT|BTL|EA|PK)\b", re.IGNORECASE)
_CODE_RE = re.compile(r"(^\d[\d\s]{0,5}\s+|\s+\d[\d\s]{0,4}$|^[A-Z0-9]{5,}\s+)")


def _clean_name(raw: str) -> str:
    name = _CODE_RE.sub("", raw)
    name = _SUFFIX_RE.sub("", name)
    return re.sub(r"\s{2,}", " ", name).strip().title()


def _categorise(name: str) -> str:
    lower = name.lower()
    if any(k in lower for k in _ALCOHOL):
        return "alcohol"
    if any(k in lower for k in _CLEANING):
        return "cleaning"
    if any(k in lower for k in _PERSONAL):
        return "personal"
    if any(k in lower for k in _HOUSEHOLD):
        return "household"
    return "groceries"


def _safe_float(value: Optional[str]) -> float:
    if not value:
        return 0.0
    try:
        return float(value.replace("$", "").replace(",", "").strip())
    except ValueError:
        return 0.0


def _get_field(fields: list, field_type: str) -> Optional[str]:
    for f in fields:
        if f.get("Type", {}).get("Text") == field_type:
            return f.get("ValueDetection", {}).get("Text")
    return None


def parse_textract_response(textract_data: dict) -> ReceiptScanResponse:
    doc = (textract_data.get("ExpenseDocuments") or [{}])[0]
    summary = doc.get("SummaryFields", [])
    groups = doc.get("LineItemGroups", [])

    store_name = _get_field(summary, "VENDOR_NAME") or "Unknown Store"
    receipt_date = _get_field(summary, "INVOICE_RECEIPT_DATE")
    total = _safe_float(_get_field(summary, "TOTAL"))
    subtotal = _safe_float(_get_field(summary, "SUBTOTAL"))
    gst_raw = _get_field(summary, "TAX")
    gst = _safe_float(gst_raw) if gst_raw else round(total / 11, 2)

    items: list[ReceiptItem] = []
    for group in groups:
        for line in group.get("LineItems", []):
            fields = line.get("LineItemExpenseFields", [])
            name = _clean_name(_get_field(fields, "ITEM") or "")
            if not name:
                continue
            confidences = [
                f["ValueDetection"]["Confidence"] / 100
                for f in fields
                if f.get("ValueDetection", {}).get("Confidence") is not None
            ]
            items.append(ReceiptItem(
                id=str(uuid.uuid4()),
                name=name,
                quantity=_safe_float(_get_field(fields, "QUANTITY") or "1"),
                unit_price=_safe_float(_get_field(fields, "UNIT_PRICE") or "0"),
                total_price=_safe_float(_get_field(fields, "PRICE") or "0"),
                category=_categorise(name),
                confidence=round(sum(confidences) / len(confidences), 3) if confidences else 1.0,
            ))

    warnings: list[str] = []
    item_sum = round(sum(i.total_price for i in items), 2)
    if total and abs(item_sum - total) > 0.10:
        warnings.append(
            f"Total mismatch detected (items sum ${item_sum:.2f}, receipt total ${total:.2f})"
        )
    low = sum(1 for i in items if i.confidence < 0.80)
    if low:
        warnings.append(f"Low confidence on {low} item{'s' if low > 1 else ''}")

    return ReceiptScanResponse(
        store_name=store_name, receipt_date=receipt_date, items=items,
        subtotal=subtotal, gst=gst, total=total, warnings=warnings,
    )
