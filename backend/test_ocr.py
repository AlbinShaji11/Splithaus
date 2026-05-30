# coding: utf-8
import json
import os
import re
import sys
from pathlib import Path


def extract_price(text: str) -> float | None:
    """Extract price from text. Handles 8.69, -1.00, $95.17"""
    text = text.strip().replace('$', '')
    match = re.search(r'-?\d+\.\d{2}', text)
    if match:
        try:
            return round(float(match.group()), 2)
        except ValueError:
            return None
    return None


def parse_woolworths(lines: list) -> dict:
    """
    Parse Woolworths digital receipt lines.

    Layout (from pdfplumber):
    Each line is full width - item name + price on same line
    OR item name alone (price on next line or modifier line below)

    Cases:
    1. Standard:   "H2coco Pure Coconut Water 2L        6.00"
    2. Weight:     "Mandarin Imperial"
                   "2.227 kg NET @ $3.90/kg             8.69"
    3. Qty:        "GB Value GarlicBread2pk 450g"
                   "Qty 2 @ $2.10 each                  4.20"
    4. ANY:        "COOK Chx Leg Fillet Paprika&Chili"
                   "Qty 2 @ $8.00 each                 16.00"
                   "ANY 2 for $15.00                   -1.00"
    5. Discounts:  "Our WW Brand Disc                  -3.53"
    """

    # Regex patterns
    price_at_end = re.compile(r'^(.*?)\s+(-?\$?\d+\.\d{2})\s*$')
    qty_re = re.compile(
        r'^qty\s+\d+\s+@\s+\$?[\d.]+\s+each', re.IGNORECASE
    )
    weight_re = re.compile(
        r'[\d.]+\s*kg\s+net\s+@\s+\$?[\d.]+', re.IGNORECASE
    )
    any_re = re.compile(
        r'^any\s+\d+\s+for\s+\$?[\d.]+', re.IGNORECASE
    )
    price_reduced_re = re.compile(
        r'^price\s+reduced', re.IGNORECASE
    )

    # Lines to skip entirely
    skip_re = re.compile(
        r'^(description|\$|promotional\s+price|tax\s+invoice|'
        r'abn\s+\d|ph:\s*\d|\d{4}\s+cowes|woolworths\s+group|'
        r'merch\s+id|debit|mastercard|visa|eftpos|approved|'
        r'purchase|pos\s+\d|bws|wine\s+offers|rewards|t&cs|'
        r'everyday\s+extra|coupon|present\s+your|'
        r'one\s+\d+\s+pack|no\s+further|all\s+bws|sparrow|'
        r'night\s+guard|skywater|moorakyne|te\s+rua|'
        r'taxable|you\s+saved|change|x-\d+|arqc|atc|psn|'
        r'term\s+id|approved|total\s+includes|ewallet|'
        r'\d{10,})',
        re.IGNORECASE
    )

    # Find parse boundaries
    start_idx = 0
    stop_idx = len(lines)

    for i, line in enumerate(lines):
        tl = line.strip().lower()
        if 'description' in tl and '$' in line:
            start_idx = i + 1
        if re.search(r'\bsubtotal\b', tl) or \
           re.search(r'promotional\s+price', tl):
            stop_idx = i
            break

    item_lines = lines[start_idx:stop_idx]

    print(f"\n=== ITEM LINES ({len(item_lines)}) ===")
    for ln in item_lines:
        print(f"  {repr(ln)}")

    # Walk lines and apply cases
    items = []
    i = 0

    while i < len(item_lines):
        line = item_lines[i].strip()
        tl = line.lower()

        # Skip empty or noise lines
        if not line or len(line) < 2 or skip_re.search(tl):
            i += 1
            continue

        # Skip pure modifier lines (handled via peek)
        if qty_re.match(tl) or weight_re.search(tl) \
                or any_re.match(tl) or price_reduced_re.match(tl):
            i += 1
            continue

        # Peek ahead
        next1 = item_lines[i + 1].strip() \
            if i + 1 < len(item_lines) else ''
        next2 = item_lines[i + 2].strip() \
            if i + 2 < len(item_lines) else ''
        next1_lower = next1.lower()
        next2_lower = next2.lower()

        # -- Case 3: Weight-based -------------------------------------
        if weight_re.search(next1_lower):
            # Price is on the weight line
            m = price_at_end.match(next1)
            if m:
                price = extract_price(m.group(2))
                if price and price > 0:
                    name = re.sub(r'^[\^#\*\s]+', '', line)
                    items.append({
                        'name': name,
                        'price': price,
                        'type': 'item'
                    })
            i += 2
            continue

        # -- Case 2 & 4: Qty-based ------------------------------------
        if qty_re.match(next1_lower):
            # Price is on the Qty line
            m = price_at_end.match(next1)
            if m:
                price = extract_price(m.group(2))
                if price and price > 0:
                    name = re.sub(r'^[\^#\*\s]+', '', line)
                    items.append({
                        'name': name,
                        'price': price,
                        'type': 'item'
                    })

            # Case 4: ANY discount follows Qty
            if any_re.match(next2_lower):
                m2 = price_at_end.match(next2)
                if m2:
                    disc = extract_price(m2.group(2))
                    if disc and disc < 0:
                        items.append({
                            'name': next2,
                            'price': disc,
                            'type': 'discount'
                        })
                i += 3
                continue

            i += 2
            continue

        # -- Case 5: Discounts ----------------------------------------
        if re.search(r'\bdisc\b|discount', tl):
            m = price_at_end.match(line)
            if m:
                price = extract_price(m.group(2))
                if price is not None:
                    name = re.sub(r'^[\^#\*\s]+', '', m.group(1))
                    items.append({
                        'name': name.strip(),
                        'price': price,
                        'type': 'discount'
                    })
            i += 1
            continue

        # -- Case 1: Standard item ------------------------------------
        m = price_at_end.match(line)
        if m:
            name = re.sub(r'^[\^#\*\s]+', '', m.group(1)).strip()
            price = extract_price(m.group(2))
            if price and price > 0 and len(name) > 2:
                items.append({
                    'name': name,
                    'price': price,
                    'type': 'item'
                })

        i += 1

    return items


def extract_totals(lines: list) -> dict:
    """Extract subtotal, GST, total from full line list."""
    price_re = re.compile(r'\$?([\d]+\.[\d]{2})')
    total = 0.0
    subtotal = 0.0
    gst = 0.0

    for line in lines:
        tl = line.lower()
        prices = price_re.findall(line)
        if not prices:
            continue
        val = float(prices[-1])

        if 'subtotal' in tl:
            subtotal = val
        elif 'purchase' in tl and val > 0:
            total = val
        elif 'includes gst' in tl and val > 0:
            gst = val

    return {'total': total, 'subtotal': subtotal, 'gst': gst}


def detect_store(lines: list) -> str:
    """Detect store name from receipt lines."""
    patterns = {
        'Woolworths': r'wool\s*worths|woolies',
        'Coles': r'\bcoles\b',
        'Aldi': r'\baldi\b',
        'IGA': r'\biga\b',
        'Kmart': r'\bkmart\b',
        'Target': r'\btarget\b',
        'Dan Murphys': r"dan\s*murphy",
        'JB Hi-Fi': r'jb\s*hi.?fi',
        'AGL': r'\bagl\b',
        'Origin': r'\borigin\s*energy\b',
    }
    for line in lines:
        for store, pattern in patterns.items():
            if re.search(pattern, line, re.IGNORECASE):
                return store
    return 'Unknown Store'


def scan_receipt(file_path: str):
    import pdfplumber

    ext = Path(file_path).suffix.lower()
    print(f"\n{'='*50}")
    print(f"Scanning: {file_path} ({ext.upper()})")
    print('='*50)

    # -- Extract text -------------------------------------------------
    if ext == '.pdf':
        print("Extracting text from PDF...")
        text = ''
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                extracted = page.extract_text()
                if extracted:
                    text += extracted + '\n'

        if not text.strip():
            print("No text found in PDF - may be a scanned image.")
            print("Try a JPG/PNG photo instead.")
            return

        lines = [ln for ln in text.splitlines() if ln.strip()]

    elif ext in ['.jpg', '.jpeg', '.png', '.webp']:
        # For images, fall back to PaddleOCR
        print("Image file - using PaddleOCR...")
        from paddleocr import PaddleOCR

        ocr = PaddleOCR(
            use_angle_cls=True, lang='en',
            use_gpu=False, show_log=False
        )
        result = ocr.ocr(file_path, cls=True)
        if not result or not result[0]:
            print("No text detected.")
            return
        lines = [item[1][0] for item in result[0]]
    else:
        print(f"Unsupported format: {ext}")
        return

    print(f"Extracted {len(lines)} lines")

    # -- Parse --------------------------------------------------------
    store = detect_store(lines)
    items = parse_woolworths(lines)
    totals = extract_totals(lines)

    # -- Print results ------------------------------------------------
    print(f"\n{'='*50}")
    print("=== PARSED RECEIPT ===")
    print(f"Store:     {store}")
    print(f"Items:     {len(items)}")

    item_total = 0.0
    for it in items:
        tag = '[DISC]' if it['type'] == 'discount' else '[ITEM]'
        print(f"  {tag} {it['name']:<44} ${it['price']:>7.2f}")
        item_total += it['price']

    print(f"\nItems sum:  ${item_total:.2f}")
    print(f"Subtotal:   ${totals['subtotal']:.2f}")
    print(f"GST:        ${totals['gst']:.2f}")
    print(f"Total:      ${totals['total']:.2f}")

    if totals['total'] > 0:
        diff = abs(item_total - totals['total'])
        if diff > 0.10:
            print(
                f"\n[!]  Items sum (${item_total:.2f}) differs from "
                f"total (${totals['total']:.2f}) by ${diff:.2f}"
            )
        else:
            print(f"\n[ok]  Totals match (diff: ${diff:.2f})")

    # -- Save JSON ----------------------------------------------------
    result = {
        'store': store,
        'items': items,
        'subtotal': totals['subtotal'] or round(item_total, 2),
        'gst': totals['gst'],
        'total': totals['total'],
        'line_count': len(lines)
    }

    output = file_path.replace(ext, '_parsed.json')
    with open(output, 'w') as f:
        json.dump(result, f, indent=2)
    print(f"\nSaved -> {output}")


if __name__ == '__main__':
    if len(sys.argv) > 1:
        scan_receipt(sys.argv[1])
    else:
        for f in ['test_receipt.pdf', 'test_receipt.jpg',
                  'test_receipt.png']:
            if os.path.exists(f):
                scan_receipt(f)
                break
        else:
            print("Usage: py -3.11 test_ocr.py your_receipt.pdf")