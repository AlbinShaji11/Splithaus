# coding: utf-8
import os
import re
import tempfile
from pathlib import Path

import pdfplumber
from fastapi import HTTPException

from app.models.schemas import ReceiptItem, ReceiptScanResponse
from app.parsers import parse_receipt, parse_receipt_html


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


def parse_woolworths(lines: list) -> list:
    """Parse Woolworths digital receipt lines."""

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

    items = []
    i = 0

    while i < len(item_lines):
        line = item_lines[i].strip()
        tl = line.lower()

        if not line or len(line) < 2 or skip_re.search(tl):
            i += 1
            continue

        if qty_re.match(tl) or weight_re.search(tl) \
                or any_re.match(tl) or price_reduced_re.match(tl):
            i += 1
            continue

        next1 = item_lines[i + 1].strip() if i + 1 < len(item_lines) else ''
        next2 = item_lines[i + 2].strip() if i + 2 < len(item_lines) else ''
        next1_lower = next1.lower()
        next2_lower = next2.lower()

        # -- Case 3: Weight-based
        if weight_re.search(next1_lower):
            m = price_at_end.match(next1)
            if m:
                price = extract_price(m.group(2))
                if price and price > 0:
                    name = re.sub(r'^[\^#\*\s]+', '', line)
                    items.append({'name': name, 'price': price, 'type': 'item'})
            i += 2
            continue

        # -- Case 2 & 4: Qty-based
        if qty_re.match(next1_lower):
            m = price_at_end.match(next1)
            if m:
                price = extract_price(m.group(2))
                if price and price > 0:
                    name = re.sub(r'^[\^#\*\s]+', '', line)
                    items.append({'name': name, 'price': price, 'type': 'item'})

            if any_re.match(next2_lower):
                m2 = price_at_end.match(next2)
                if m2:
                    disc = extract_price(m2.group(2))
                    if disc and disc < 0:
                        items.append({'name': next2, 'price': disc, 'type': 'discount'})
                i += 3
                continue

            i += 2
            continue

        # -- Case 5: Discounts
        if re.search(r'\bdisc\b|discount', tl):
            m = price_at_end.match(line)
            if m:
                price = extract_price(m.group(2))
                if price is not None:
                    name = re.sub(r'^[\^#\*\s]+', '', m.group(1))
                    items.append({'name': name.strip(), 'price': price, 'type': 'discount'})
            i += 1
            continue

        # -- Case 1: Standard item
        m = price_at_end.match(line)
        if m:
            name = re.sub(r'^[\^#\*\s]+', '', m.group(1)).strip()
            price = extract_price(m.group(2))
            if price and price > 0 and len(name) > 2:
                items.append({'name': name, 'price': price, 'type': 'item'})

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
        'Dan Murphys': r'dan\s*murphy',
        'JB Hi-Fi': r'jb\s*hi.?fi',
        'AGL': r'\bagl\b',
        'Origin': r'\borigin\s*energy\b',
    }
    for line in lines:
        for store, pattern in patterns.items():
            if re.search(pattern, line, re.IGNORECASE):
                return store
    return 'Unknown Store'


def _build_response(
    lines: list[str],
    items_raw: list[dict],
    totals: dict,
    store: str,
) -> ReceiptScanResponse:
    items_sum = round(sum(it['price'] for it in items_raw), 2)
    warnings: list[str] = []
    if totals['total'] > 0 and abs(items_sum - totals['total']) > 0.05:
        diff = abs(items_sum - totals['total'])
        warnings.append(f"Totals differ by ${diff:.2f}")
    return ReceiptScanResponse(
        store=store,
        items=[ReceiptItem(**it) for it in items_raw],
        subtotal=totals['subtotal'] or items_sum,
        gst=totals['gst'],
        total=totals['total'],
        line_count=len(lines),
        warnings=warnings,
    )


def parse_pdf(file_bytes: bytes) -> ReceiptScanResponse:
    tmp_path: str | None = None
    try:
        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as tmp:
            tmp.write(file_bytes)
            tmp_path = tmp.name

        text = ''
        with pdfplumber.open(tmp_path) as pdf:
            for page in pdf.pages:
                extracted = page.extract_text()
                if extracted:
                    text += extracted + '\n'

        if not text.strip():
            raise HTTPException(
                status_code=400,
                detail='PDF appears to be scanned. Please upload a photo instead.',
            )

        lines = [ln for ln in text.splitlines() if ln.strip()]
        store = detect_store(lines)
        items_raw = parse_receipt(lines)
        if store == 'Kmart':
            from app.parsers.kmart import extract_kmart_totals
            totals = extract_kmart_totals(lines)
        else:
            totals = extract_totals(lines)
        return _build_response(lines, items_raw, totals, store)
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)


def parse_html(file_bytes: bytes) -> ReceiptScanResponse:
    from bs4 import BeautifulSoup  # noqa: PLC0415 - lazy import, optional dep
    from app.parsers.costco import extract_costco_totals

    html = file_bytes.decode('utf-8', errors='replace')
    soup = BeautifulSoup(html, 'html.parser')

    container = soup.find('mat-dialog-container')
    if not container:
        container = soup.find('body') or soup

    text = container.get_text(separator='\n', strip=True)
    if not text.strip():
        raise HTTPException(status_code=400, detail='No readable text found in HTML file.')

    # Strip navigation/header text - receipt content always begins at TAX INVOICE ($)
    marker = 'TAX INVOICE ($)'
    idx = text.find(marker)
    if idx == -1:
        raise HTTPException(
            status_code=400,
            detail=(
                'Could not find receipt content in this file. '
                'Make sure you saved the page with the receipt modal open and visible.'
            ),
        )
    text = text[idx:]

    items_raw = parse_receipt_html(text)
    totals = extract_costco_totals(text)
    lines = [ln for ln in text.splitlines() if ln.strip()]
    return _build_response(lines, items_raw, totals, 'Costco')


def parse_image(file_bytes: bytes, filename: str) -> ReceiptScanResponse:
    ext = Path(filename).suffix.lower() or '.jpg'
    tmp_path: str | None = None
    try:
        with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
            tmp.write(file_bytes)
            tmp_path = tmp.name

        from paddleocr import PaddleOCR  # noqa: PLC0415 - lazy import avoids slow startup
        ocr = PaddleOCR(use_angle_cls=True, lang='en', use_gpu=False, show_log=False)
        result = ocr.ocr(tmp_path, cls=True)

        if not result or not result[0]:
            raise HTTPException(status_code=400, detail='No text detected in image.')

        lines = [item[1][0] for item in result[0]]
        store = detect_store(lines)
        items_raw = parse_receipt(lines)
        totals = extract_totals(lines)
        return _build_response(lines, items_raw, totals, store)
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)
