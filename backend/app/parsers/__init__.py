# coding: ascii
"""
Receipt parser router.

Supported stores:
  - Woolworths (PDF/image — woolworths, woolworths.com.au)
  - Costco     (HTML    — costco, costco.com.au, costco wholesale)

Stubs for future stores (add parser modules and wire them in below):
  - Coles  (coles, coles.com.au, flybuys)
  - Kmart  (kmart, kmart.com.au)
"""
from typing import Optional

from app.parsers.woolworths import parse_woolworths
from app.parsers.costco import parse_costco

# Detection keywords per store (case-insensitive substring match)
_STORE_KEYWORDS: dict[str, list[str]] = {
    'woolworths': ['woolworths', 'woolworths.com.au', 'woolies'],
    'costco': ['costco wholesale', 'costco.com.au', 'costco'],
    'coles': ['coles', 'coles.com.au', 'flybuys'],
    'kmart': ['kmart', 'kmart.com.au'],
}

SUPPORTED_STORES = ['Woolworths', 'Costco']


def detect_store(text: str) -> Optional[str]:
    """
    Scan extracted receipt text and return a store key, or None if unrecognised.
    Longer/more-specific keywords are listed first within each store entry so
    they take precedence (e.g. 'costco wholesale' before 'costco').
    """
    text_lower = text.lower()
    for store, keywords in _STORE_KEYWORDS.items():
        for kw in keywords:
            if kw in text_lower:
                return store
    return None


def parse_receipt(lines: list) -> list:
    """
    Route receipt lines (from PDF/image) to the correct store parser.

    Returns a list of item dicts: {'name': str, 'price': float, 'type': str}.
    Raises ValueError for unsupported or unrecognised stores.
    """
    text = '\n'.join(lines)
    store = detect_store(text)

    if store == 'woolworths':
        return parse_woolworths(lines)

    # case 'coles': return parse_coles(lines)  # TODO: implement
    # case 'kmart': return parse_kmart(lines)  # TODO: implement

    if store == 'costco':
        raise ValueError(
            "Costco receipts must be uploaded as HTML files (File → Save As from costco.com.au)."
        )

    if store is not None:
        raise ValueError(f"{store.title()} parsing not yet supported")

    raise ValueError("Unrecognised store — please use a Woolworths or Costco receipt")


def parse_receipt_html(text: str) -> list:
    """
    Route HTML-extracted receipt text to the correct store parser.

    Returns a list of item dicts. Raises ValueError for unsupported stores.
    """
    store = detect_store(text)

    if store == 'costco':
        return parse_costco(text)

    # case 'coles': return parse_coles_html(text)  # TODO: implement

    if store is not None:
        raise ValueError(
            f"{store.title()} HTML parsing not yet supported. "
            f"Try uploading as PDF instead."
        )

    raise ValueError(
        "Unrecognised store in HTML file. "
        "Supported HTML receipts: Costco (costco.com.au)"
    )
