# coding: ascii
"""
Receipt parser router.

Supported stores:
  - Woolworths (woolworths, woolworths.com.au)

Stubs for future stores (add parser modules and wire them in below):
  - Coles   (coles, coles.com.au, flybuys)
  - Costco  (costco, costco.com.au)
  - Kmart   (kmart, kmart.com.au)
"""
import re
from typing import Optional

from app.parsers.woolworths import parse_woolworths

# Detection keywords per store (case-insensitive)
_STORE_KEYWORDS: dict[str, list[str]] = {
    'woolworths': ['woolworths', 'woolworths.com.au', 'woolies'],
    'coles': ['coles', 'coles.com.au', 'flybuys'],
    'costco': ['costco', 'costco.com.au'],
    'kmart': ['kmart', 'kmart.com.au'],
}

SUPPORTED_STORES = ['Woolworths']


def detect_store(text: str) -> Optional[str]:
    """Scan extracted receipt text and return a store key, or None if unrecognised."""
    text_lower = text.lower()
    for store, keywords in _STORE_KEYWORDS.items():
        for kw in keywords:
            if kw in text_lower:
                return store
    return None


def parse_receipt(lines: list) -> list:
    """
    Route receipt lines to the correct store parser.

    Returns a list of item dicts: {'name': str, 'price': float, 'type': str}.
    Raises ValueError for unsupported or unrecognised stores.
    """
    text = '\n'.join(lines)
    store = detect_store(text)

    if store == 'woolworths':
        return parse_woolworths(lines)

    # case 'coles': return parse_coles(lines)  # TODO: implement
    # case 'costco': return parse_costco(lines)  # TODO: implement
    # case 'kmart': return parse_kmart(lines)  # TODO: implement

    if store is not None:
        raise ValueError(f"{store.title()} parsing not yet supported")

    raise ValueError("Unrecognised store — please use a Woolworths receipt")
