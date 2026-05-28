from app.services.parser import extract_price, parse_woolworths


def test_extract_price_basic():
    assert extract_price("8.69") == 8.69


def test_extract_price_with_dollar():
    assert extract_price("$12.50") == 12.50


def test_extract_price_negative():
    assert extract_price("-1.00") == -1.00


def test_extract_price_no_match():
    assert extract_price("abc") is None


def test_extract_price_empty():
    assert extract_price("") is None


def test_parse_woolworths_single_item():
    lines = [
        "Description                      $",
        "Full Cream Milk 2L           4.20",
        "Subtotal",
    ]
    items = parse_woolworths(lines)
    assert len(items) == 1
    assert items[0]["name"] == "Full Cream Milk 2L"
    assert items[0]["price"] == 4.20
    assert items[0]["type"] == "item"


def test_parse_woolworths_discount_line():
    lines = [
        "Description                      $",
        "WW Brand Disc               -1.49",
        "Subtotal",
    ]
    items = parse_woolworths(lines)
    assert len(items) == 1
    assert items[0]["price"] == -1.49
    assert items[0]["type"] == "discount"


def test_parse_woolworths_skips_eftpos_lines():
    lines = [
        "Description                      $",
        "Bread                        3.50",
        "EFTPOS                      30.00",
        "Subtotal",
    ]
    items = parse_woolworths(lines)
    assert len(items) == 1
    assert items[0]["name"] == "Bread"


def test_parse_woolworths_empty_lines():
    assert parse_woolworths([]) == []


def test_parse_woolworths_no_section_markers():
    lines = [
        "Milk                         4.20",
        "Bread                        3.50",
    ]
    items = parse_woolworths(lines)
    assert isinstance(items, list)
