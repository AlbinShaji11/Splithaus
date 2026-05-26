import pytest

from app.services.parser import _categorise, _clean_name, _safe_float, parse_textract_response


def test_clean_name_strips_ww_suffix():
    assert _clean_name("Full Cream Milk WW 2L") == "Full Cream Milk 2L"


def test_clean_name_title_case():
    assert _clean_name("FREE RANGE EGGS") == "Free Range Eggs"


def test_clean_name_removes_leading_number_code():
    assert _clean_name("1234 Bread Loaf") == "Bread Loaf"


def test_clean_name_collapses_extra_whitespace():
    assert _clean_name("Chips   BBQ") == "Chips Bbq"


def test_categorise_alcohol_beer():
    assert _categorise("Corona Beer 6pk") == "alcohol"


def test_categorise_alcohol_wine():
    assert _categorise("Jacob's Creek Wine") == "alcohol"


def test_categorise_cleaning():
    assert _categorise("Spray n Wipe Detergent 500ml") == "cleaning"


def test_categorise_personal():
    assert _categorise("Head Shoulders Shampoo") == "personal"


def test_categorise_household_paper():
    assert _categorise("Toilet Paper 12pk") == "household"


def test_categorise_default_groceries():
    assert _categorise("Free Range Eggs 12pk") == "groceries"


def test_safe_float_dollar_sign():
    assert _safe_float("$12.50") == 12.50


def test_safe_float_comma():
    assert _safe_float("1,234.50") == 1234.50


def test_safe_float_empty_string():
    assert _safe_float("") == 0.0


def test_safe_float_none():
    assert _safe_float(None) == 0.0


def test_parse_empty_response():
    result = parse_textract_response({})
    assert result.store_name == "Unknown Store"
    assert result.items == []
    assert result.total == 0.0


def test_parse_vendor_and_single_item():
    data = {"ExpenseDocuments": [{"SummaryFields": [
        {"Type": {"Text": "VENDOR_NAME"}, "ValueDetection": {"Text": "Woolworths"}},
        {"Type": {"Text": "TOTAL"}, "ValueDetection": {"Text": "5.00"}},
    ], "LineItemGroups": [{"LineItems": [{"LineItemExpenseFields": [
        {"Type": {"Text": "ITEM"}, "ValueDetection": {"Text": "Milk", "Confidence": 99.0}},
        {"Type": {"Text": "PRICE"}, "ValueDetection": {"Text": "5.00", "Confidence": 99.0}},
        {"Type": {"Text": "QUANTITY"}, "ValueDetection": {"Text": "1", "Confidence": 99.0}},
        {"Type": {"Text": "UNIT_PRICE"}, "ValueDetection": {"Text": "5.00", "Confidence": 99.0}},
    ]}]}]}]}
    result = parse_textract_response(data)
    assert result.store_name == "Woolworths"
    assert len(result.items) == 1
    assert result.items[0].name == "Milk"
    assert result.items[0].confidence == pytest.approx(0.99)


def test_parse_total_mismatch_triggers_warning():
    data = {"ExpenseDocuments": [{"SummaryFields": [
        {"Type": {"Text": "TOTAL"}, "ValueDetection": {"Text": "50.00"}},
    ], "LineItemGroups": [{"LineItems": [{"LineItemExpenseFields": [
        {"Type": {"Text": "ITEM"}, "ValueDetection": {"Text": "Bread", "Confidence": 95.0}},
        {"Type": {"Text": "PRICE"}, "ValueDetection": {"Text": "5.00", "Confidence": 95.0}},
        {"Type": {"Text": "QUANTITY"}, "ValueDetection": {"Text": "1", "Confidence": 95.0}},
        {"Type": {"Text": "UNIT_PRICE"}, "ValueDetection": {"Text": "5.00", "Confidence": 95.0}},
    ]}]}]}]}
    result = parse_textract_response(data)
    assert any("mismatch" in w for w in result.warnings)


def test_parse_low_confidence_triggers_warning():
    fields = [
        {"Type": {"Text": "ITEM"}, "ValueDetection": {"Text": "Cheese", "Confidence": 50.0}},
        {"Type": {"Text": "PRICE"}, "ValueDetection": {"Text": "6.00", "Confidence": 50.0}},
        {"Type": {"Text": "QUANTITY"}, "ValueDetection": {"Text": "1", "Confidence": 50.0}},
        {"Type": {"Text": "UNIT_PRICE"}, "ValueDetection": {"Text": "6.00", "Confidence": 50.0}},
    ]
    data = {"ExpenseDocuments": [{"SummaryFields": [], "LineItemGroups": [
        {"LineItems": [{"LineItemExpenseFields": fields}]}
    ]}]}
    result = parse_textract_response(data)
    assert any("Low confidence" in w for w in result.warnings)
