# coding: utf-8
# Costco PDFs are raster-only (Print to PDF from browser). Use HTML upload instead.
"""
Costco receipt parser.

Input: plain text extracted from mat-dialog-container in a Costco HTML receipt
(costco.com.au > My Account > Receipts > File > Save As .html).

Each item block in the extracted text follows this structure:

    ITEM NAME LINE 1
    [OPTIONAL: name continuation or logistics codes]
    ITEM_CODE       <- 5-6 digit number on its own line
    1x
    PRICE           <- unit price (use this one)
    PRICE           <- repeated total price (ignore)
    GST_CODE        <- 0 or 1 (ignore)

TPD (Trade Price Discount) blocks have the same structure except:
  - First name line starts with "TPD "
  - An optional reference+date-range line appears before the item code
  - A bare "-" line appears after the two price lines (before GST code)

Processing stops at "****  TOTAL" or "TOTAL NUMBER OF ITEMS".
"""
import re

# --- Line-level matchers ---

_ITEM_CODE_RE = re.compile(r'^\d{5,6}$')
_QTY_RE = re.compile(r'^1x$', re.IGNORECASE)
_PRICE_RE = re.compile(r'^\d[\d,]*\.\d{2}$')
_BARE_MINUS_RE = re.compile(r'^-$')
_GST_CODE_RE = re.compile(r'^[01]$')
_STOP_RE = re.compile(r'\*{4}|total\s+number\s+of\s+items', re.IGNORECASE)
_TPD_PREFIX_RE = re.compile(r'^TPD\s+', re.IGNORECASE)

# Logistics/storage token patterns (all tokens on a line must match for the
# whole line to be considered a logistics code line and skipped)
_LOGISTICS_TOKEN_RE = re.compile(
    r'^('
    r'MP\d+'                    # MP73295
    r'|T\d+H\d+'               # T84H1
    r'|P\d+'                    # P2
    r'|SL\d+'                   # SL1
    r'|C\d+/L\d+/P\d+/D\d+'   # C22/L5/P4/D1
    r'|L\d+/P\d+'              # L2/P3
    r'|L/\d+/P\d+/D\d+'       # L/2/P3/D4
    r')$',
    re.IGNORECASE,
)

# Item-code reference lines with dates, e.g. "200715 27/5 TO 2/6"
_DATE_REF_RE = re.compile(r'^\d{5,6}\b.*\d{1,2}/\d{1,2}', re.IGNORECASE)

# Bare amount line (standalone price value, with or without $)
_BARE_AMOUNT_RE = re.compile(r'^\$?\d[\d,]*\.\d{2}$')

# Known header/boilerplate lines from the Costco HTML dialog
_HEADER_LINE_RE = re.compile(
    r'^('
    r'close|receipt\b|member\s*[:#]?|costco\b|warehouse\b|'
    r'date\s*[:.]?\s*$|store\s*[:.]?\s*$|total\s*[:.]?\s*$|sub.?total|'
    r'order\b|invoice\b|abn\b|thank\b|'
    r'\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)|'
    r'\d{1,2}[/-]\d{1,2}[/-]\d{2,4}'
    r')',
    re.IGNORECASE,
)


def _is_logistics_line(line: str) -> bool:
    tokens = line.strip().split()
    return bool(tokens) and all(_LOGISTICS_TOKEN_RE.match(t) for t in tokens)


def _build_name(lines: list) -> tuple:
    """
    Filter accumulated pre-code lines into a clean item name.
    Returns (name: str, is_tpd: bool).
    """
    is_tpd = False
    kept = []

    for line in lines:
        if not line or len(line) <= 1:
            continue

        # TPD prefix = Trade Price Discount
        if _TPD_PREFIX_RE.match(line):
            is_tpd = True
            rest = _TPD_PREFIX_RE.sub('', line).strip()
            if rest:
                kept.append(rest)
            continue

        # Skip logistics code lines (all tokens are storage codes)
        if _is_logistics_line(line):
            continue

        # Skip date-reference lines (item code + date range)
        if _DATE_REF_RE.match(line):
            continue

        # Skip bare amount/price lines
        if _BARE_AMOUNT_RE.match(line):
            continue

        # Skip single digits (GST codes, stray quantities)
        if re.match(r'^[0-9]$', line):
            continue

        # Skip "1x" quantity markers that leaked into the buffer
        if _QTY_RE.match(line):
            continue

        # Skip known header/boilerplate lines
        if _HEADER_LINE_RE.match(line):
            continue

        kept.append(line)

    name = ' '.join(kept).strip()
    return name, is_tpd


def parse_costco(text: str) -> list:
    """
    Parse Costco receipt text into a list of item dicts.

    Returns:
        [{'name': str, 'price': float, 'type': 'item' | 'discount'}, ...]
    """
    raw = [ln.strip() for ln in text.splitlines()]
    n = len(raw)
    items = []
    name_buf: list = []
    i = 0

    while i < n:
        line = raw[i]

        if not line:
            i += 1
            continue

        # Stop at ****  TOTAL or TOTAL NUMBER OF ITEMS
        if _STOP_RE.search(line):
            break

        # Item code: 5-6 digit number on its own line
        if _ITEM_CODE_RE.match(line):
            i += 1  # move past the item code

            # Consume "1x"
            if i < n and _QTY_RE.match(raw[i]):
                i += 1

            # First price = unit price (the one we keep)
            price: float | None = None
            if i < n and _PRICE_RE.match(raw[i]):
                try:
                    price = round(float(raw[i].replace(',', '')), 2)
                except ValueError:
                    pass
                i += 1

            # Second price = repeated total (skip)
            if i < n and _PRICE_RE.match(raw[i]):
                i += 1

            # Bare "-" indicates a TPD / discount block
            is_negative = False
            if i < n and _BARE_MINUS_RE.match(raw[i]):
                is_negative = True
                i += 1

            # GST code (0 or 1) - skip
            if i < n and _GST_CODE_RE.match(raw[i]):
                i += 1

            # Emit item from accumulated name buffer
            if price is not None and price > 0:
                name, is_tpd = _build_name(name_buf)
                if name:
                    final_price = -price if (is_negative or is_tpd) else price
                    item_type = 'discount' if (is_negative or is_tpd) else 'item'
                    if is_tpd:
                        name = 'Costco Savings: ' + name
                    items.append({'name': name, 'price': final_price, 'type': item_type})

            name_buf = []
            continue

        # Not a stop or item code - accumulate as potential name content
        name_buf.append(line)
        i += 1

    return items


def extract_costco_totals(text: str) -> dict:
    """Extract receipt total from Costco HTML receipt text.

    Prefers the DEBIT MASTERCARD/VISA/CARD line (actual amount charged)
    over the **** TOTAL line, because the charged amount matches what
    users paid and avoids GST-calculation mismatches.
    """
    total = 0.0
    gst = 0.0
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]

    for j, line in enumerate(lines):
        # DEBIT line = actual amount charged to card (most accurate comparison target)
        m_debit = re.search(
            r'DEBIT\s+(?:MASTERCARD|VISA|EFTPOS|CARD)\s+([\d,]+\.\d{2})',
            line, re.IGNORECASE,
        )
        if m_debit:
            total = float(m_debit.group(1).replace(',', ''))
            continue

        # **** TOTAL line as fallback when no DEBIT line is present
        if re.match(r'\*{4}', line) and total == 0.0:
            m = re.search(r'[\d,]+\.\d{2}', line)
            if m:
                total = float(m.group().replace(',', ''))
            elif j + 1 < len(lines):
                m2 = re.match(r'^[\d,]+\.\d{2}$', lines[j + 1])
                if m2:
                    total = float(m2.group().replace(',', ''))

        elif re.search(r'includes?\s+gst|gst\s+included', line, re.IGNORECASE):
            m = re.search(r'[\d,]+\.\d{2}', line)
            if m:
                gst = float(m.group().replace(',', ''))

    # Estimate GST from total if not explicitly stated (AU rate = 1/11)
    if total > 0 and gst == 0:
        gst = round(total / 11, 2)

    return {'total': total, 'subtotal': total, 'gst': gst}
