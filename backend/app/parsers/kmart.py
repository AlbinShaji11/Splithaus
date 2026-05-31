# coding: utf-8
"""
Kmart receipt parser.

Input: plain text extracted from a Kmart PDF receipt via pdfplumber.
Format:
  - Header lines (store name, address, ABN, Tax Invoice, top-level total amount)
  - SALE: <barcode> line  ← parsing starts AFTER this line
  - Item lines: ITEM NAME [$PRICE] or ITEM NAME x<QTY> $PRICE
  - Footer trigger lines: Subtotal, Total, GST, DEBIT, MASTERCARD, VISA, EFTPOS, Purchased, etc.
"""
import re

_ITEM_RE = re.compile(r'^(.+?)\s+(?:x(\d+)\s+)?\$(\d+\.\d{2})$')

_STOP_RE = re.compile(
    r'^(Subtotal|Total|GST|DEBIT|MASTERCARD|VISA|EFTPOS|Purchased|Return\s+Policy|Thank\s+you)',
    re.IGNORECASE,
)


def parse_kmart(lines: list) -> list:
    """
    Parse Kmart receipt lines into a list of item dicts.

    Returns:
        [{'name': str, 'price': float, 'type': 'item'}, ...]
    """
    items = []
    parsing = False

    for line in lines:
        line = line.strip()
        if not line:
            continue

        # Start parsing after the SALE: barcode line
        if not parsing:
            if re.match(r'^SALE\s*:', line, re.IGNORECASE):
                parsing = True
            continue

        # Stop at footer keywords
        if _STOP_RE.match(line):
            break

        m = _ITEM_RE.match(line)
        if m:
            raw_name = m.group(1).strip()
            qty_str = m.group(2)
            price = round(float(m.group(3)), 2)

            if qty_str and int(qty_str) > 1:
                name = f'{raw_name} (x{qty_str})'
            else:
                name = raw_name

            items.append({'name': name, 'price': price, 'type': 'item'})

    return items


def extract_kmart_totals(lines: list) -> dict:
    """Extract the Total (inc. GST) from Kmart receipt lines."""
    total = 0.0
    gst = 0.0
    for line in lines:
        line = line.strip()
        m_total = re.match(r'^Total\s+\$(\d+\.\d{2})$', line, re.IGNORECASE)
        if m_total:
            total = float(m_total.group(1))
        m_gst = re.match(r'^GST\s+included\s+in\s+total\s+\$(\d+\.\d{2})$', line, re.IGNORECASE)
        if m_gst:
            gst = float(m_gst.group(1))

    if total > 0 and gst == 0:
        gst = round(total / 11, 2)

    return {'total': total, 'subtotal': round(total - gst, 2), 'gst': gst}
