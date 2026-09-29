"""Smoke tests for shared/python/pii_validators.py.

Run from repo root:

    python -m unittest shared.python.test_pii_validators -v
"""
from __future__ import annotations

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from pii_validators import (  # noqa: E402
    normalize_phone_in,
    validate_aadhaar,
    validate_email_extra,
    validate_gst,
    validate_login_username,
    validate_no_spam_name,
    validate_pan,
    validate_pincode_in,
)


class TestPhone(unittest.TestCase):
    def test_valid_indian_mobile(self):
        # Use truly arbitrary Indian mobiles (no repeated runs, no 6-digit
        # ascending or descending sequential runs).
        self.assertEqual(normalize_phone_in("9845162703"), "+919845162703")
        self.assertEqual(normalize_phone_in("+917042816350"), "+917042816350")
        self.assertEqual(normalize_phone_in("6203748159"), "+916203748159")

    def test_rejects_repeated_digits(self):
        for spam in ["3333333333", "9999999999", "0000000000", "1111111111"]:
            with self.assertRaises(ValueError, msg=f"Should reject {spam}"):
                normalize_phone_in(spam)

    def test_rejects_sequential(self):
        # 9876543210 (the canonical "lazy spam" Indian mobile) IS sequential
        # in our heuristic and SHOULD be rejected.
        for spam in ["9876543210", "0123456789"]:
            with self.assertRaises(ValueError, msg=f"Should reject {spam}"):
                normalize_phone_in(spam)

    def test_rejects_short(self):
        for bad in ["12345", "98765"]:
            with self.assertRaises(ValueError):
                normalize_phone_in(bad)

    def test_rejects_non_indian_leading_digit(self):
        # Indian mobiles start with 6-9; 5 is invalid.
        with self.assertRaises(ValueError):
            normalize_phone_in("5876543210", allow_intl=False)

    def test_empty_returns_none(self):
        self.assertIsNone(normalize_phone_in(""))
        self.assertIsNone(normalize_phone_in(None))


class TestPincode(unittest.TestCase):
    def test_valid(self):
        self.assertEqual(validate_pincode_in("110001"), "110001")
        self.assertEqual(validate_pincode_in("600025"), "600025")

    def test_rejects_leading_zero(self):
        with self.assertRaises(ValueError):
            validate_pincode_in("010001")

    def test_rejects_wrong_length(self):
        with self.assertRaises(ValueError):
            validate_pincode_in("11001")
        with self.assertRaises(ValueError):
            validate_pincode_in("1100011")

    def test_rejects_repeated(self):
        with self.assertRaises(ValueError):
            validate_pincode_in("333333")

    def test_rejects_sequential(self):
        with self.assertRaises(ValueError):
            validate_pincode_in("123456")

    def test_empty(self):
        self.assertIsNone(validate_pincode_in(""))
        self.assertIsNone(validate_pincode_in(None))


class TestName(unittest.TestCase):
    def test_valid_names(self):
        for ok in ["Rahul", "Anita Sharma", "D'Souza", "Jean-Paul", "K. Iyer"]:
            self.assertEqual(validate_no_spam_name(ok), ok)

    def test_rejects_digits(self):
        with self.assertRaises(ValueError):
            validate_no_spam_name("1234567")

    def test_rejects_repeated_chars(self):
        with self.assertRaises(ValueError):
            validate_no_spam_name("aaaaaa")
        with self.assertRaises(ValueError):
            validate_no_spam_name("zzzzzz")

    def test_rejects_too_short(self):
        with self.assertRaises(ValueError):
            validate_no_spam_name("a")

    def test_rejects_too_long(self):
        with self.assertRaises(ValueError):
            validate_no_spam_name("a" * 130)


class TestEmail(unittest.TestCase):
    def test_disposable_blocked(self):
        with self.assertRaises(ValueError):
            validate_email_extra("test@mailinator.com")

    def test_disposable_allowed_when_flag(self):
        self.assertEqual(
            validate_email_extra("test@mailinator.com", allow_disposable=True),
            "test@mailinator.com",
        )

    def test_normalizes_case(self):
        self.assertEqual(
            validate_email_extra("Foo@Example.COM"),
            "foo@example.com",
        )

    def test_rejects_injection_and_malformed(self):
        for bad in ("1", "'1'='1'1@edu.in", "a@", "@b.com", "user@@edu.in", "x" * 300):
            with self.assertRaises(ValueError, msg=f"Should reject {bad!r}"):
                validate_email_extra(bad)

    def test_rejects_numeric_local_part(self):
        with self.assertRaises(ValueError):
            validate_email_extra("123456@edu.in")


class TestLoginUsername(unittest.TestCase):
    def test_email_path_uses_strict_rules(self):
        with self.assertRaises(ValueError):
            validate_login_username("'1'='1'1@edu.in")

    def test_employee_id_valid(self):
        self.assertEqual(validate_login_username("EMP-001"), "EMP-001")

    def test_employee_id_rejects_short(self):
        with self.assertRaises(ValueError):
            validate_login_username("1")


class TestPan(unittest.TestCase):
    def test_valid(self):
        self.assertEqual(validate_pan("ABCDE1234F"), "ABCDE1234F")

    def test_invalid(self):
        with self.assertRaises(ValueError):
            validate_pan("ABCD1234F")  # 4 letters
        with self.assertRaises(ValueError):
            validate_pan("ABCDE12345")  # ends digit


class TestAadhaar(unittest.TestCase):
    def test_valid_verhoeff(self):
        # "234567890124" is a valid Verhoeff-checksummed test number.
        self.assertEqual(validate_aadhaar("234567890124"), "234567890124")

    def test_rejects_bad_checksum(self):
        with self.assertRaises(ValueError):
            validate_aadhaar("234567890123")

    def test_rejects_leading_0_or_1(self):
        with self.assertRaises(ValueError):
            validate_aadhaar("123456789012")

    def test_rejects_repeated(self):
        with self.assertRaises(ValueError):
            validate_aadhaar("999999999999")


class TestGst(unittest.TestCase):
    def test_valid(self):
        self.assertEqual(
            validate_gst("27ABCDE1234F1Z5"),
            "27ABCDE1234F1Z5",
        )

    def test_invalid(self):
        with self.assertRaises(ValueError):
            validate_gst("27ABCDE1234F1Z")  # too short


if __name__ == "__main__":
    unittest.main(verbosity=2)
