# coding: ascii
import re


def _extract_price(text: str) -> float | None:
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
    """Parse Woolworths digital receipt lines into a list of item dicts."""

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
        if re.search(r'\bsubtotal\b', tl) or re.search(r'promotional\s+price', tl):
            stop_idx = i
            break

    item_lines = lines[start_idx:stop_idx]

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
                price = _extract_price(m.group(2))
                if price and price > 0:
                    name = re.sub(r'^[\^#\*\s]+', '', line)
                    items.append({'name': name, 'price': price, 'type': 'item'})
            i += 2
            continue

        # -- Case 2 & 4: Qty-based
        if qty_re.match(next1_lower):
            m = price_at_end.match(next1)
            if m:
                price = _extract_price(m.group(2))
                if price and price > 0:
                    name = re.sub(r'^[\^#\*\s]+', '', line)
                    items.append({'name': name, 'price': price, 'type': 'item'})

            if any_re.match(next2_lower):
                m2 = price_at_end.match(next2)
                if m2:
                    disc = _extract_price(m2.group(2))
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
                price = _extract_price(m.group(2))
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
