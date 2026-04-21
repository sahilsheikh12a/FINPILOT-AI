"""
Regex-based SMS parser for Indian bank transaction messages.
Handles HDFC, SBI, ICICI, Axis, Kotak, Paytm, PhonePe, GPay patterns.
"""
import re
from datetime import datetime
from dataclasses import dataclass
from typing import Optional


@dataclass
class ParsedTransaction:
    amount: float
    type: str  # "debit" | "credit"
    merchant: Optional[str]
    bank: Optional[str]
    account_last4: Optional[str]
    balance: Optional[float]
    transaction_date: Optional[datetime]
    raw_sms: str
    confidence: float


# Patterns ordered by specificity (most specific first)
AMOUNT_PATTERNS = [
    r"(?:INR|Rs\.?|₹)\s*([\d,]+\.?\d*)",
    r"([\d,]+\.?\d*)\s*(?:INR|Rs\.?|₹)",
]

DEBIT_KEYWORDS = [
    r"\b(?:debited|deducted|paid|spent|withdrawn|sent|transferred to)\b",
    r"\bdebit\b",
    r"\bdr\b",
]

CREDIT_KEYWORDS = [
    r"\b(?:credited|received|deposited|added)\b",
    r"\bcredit\b",
    r"\bcr\b",
]

MERCHANT_PATTERNS = [
    r"(?:at|to|from|for)\s+([A-Z][A-Za-z0-9\s&._-]{2,40}?)(?:\s+on|\s+dated|\s+\d|\.|$)",
    r"UPI[- ]?(?:ID[: ]+)?([A-Za-z0-9._@-]+)",
    r"(?:merchant|shop)[:\s]+([A-Za-z0-9\s&._-]{2,40})",
]

BANK_IDENTIFIERS = {
    "HDFC": "HDFC Bank",
    "SBI": "SBI",
    "ICICI": "ICICI Bank",
    "AXIS": "Axis Bank",
    "KOTAK": "Kotak Bank",
    "BOB": "Bank of Baroda",
    "PNB": "PNB",
    "INDUSIND": "IndusInd Bank",
    "YES": "Yes Bank",
    "PAYTM": "Paytm",
    "PHONEPE": "PhonePe",
    "GPAY": "Google Pay",
}

BALANCE_PATTERN = r"(?:Bal(?:ance)?|Avl Bal|Available Balance)[:\s]*(?:INR|Rs\.?|₹)?\s*([\d,]+\.?\d*)"
ACCOUNT_PATTERN = r"(?:a/c|acct?|account)[^X\d]*(X+\d{4}|\d{4})"
DATE_PATTERNS = [
    r"(\d{2}[/-]\d{2}[/-]\d{4})",
    r"(\d{2}[/-]\d{2}[/-]\d{2})",
    r"(\d{2}\s+\w{3}\s+\d{4})",
]


def _extract_amount(text: str) -> Optional[float]:
    for pattern in AMOUNT_PATTERNS:
        m = re.search(pattern, text, re.IGNORECASE)
        if m:
            return float(m.group(1).replace(",", ""))
    return None


def _extract_type(text: str) -> tuple[Optional[str], float]:
    text_lower = text.lower()
    debit_score = sum(1 for p in DEBIT_KEYWORDS if re.search(p, text_lower))
    credit_score = sum(1 for p in CREDIT_KEYWORDS if re.search(p, text_lower))

    if debit_score > credit_score:
        confidence = min(1.0, 0.6 + debit_score * 0.1)
        return "debit", confidence
    elif credit_score > debit_score:
        confidence = min(1.0, 0.6 + credit_score * 0.1)
        return "credit", confidence
    return None, 0.4


def _extract_merchant(text: str) -> Optional[str]:
    for pattern in MERCHANT_PATTERNS:
        m = re.search(pattern, text, re.IGNORECASE)
        if m:
            merchant = m.group(1).strip()
            if len(merchant) > 2:
                return merchant[:60]
    return None


def _extract_bank(text: str) -> Optional[str]:
    text_upper = text.upper()
    for key, name in BANK_IDENTIFIERS.items():
        if key in text_upper:
            return name
    return None


def _extract_account(text: str) -> Optional[str]:
    m = re.search(ACCOUNT_PATTERN, text, re.IGNORECASE)
    if m:
        acc = m.group(1)
        return acc[-4:] if len(acc) >= 4 else acc
    return None


def _extract_balance(text: str) -> Optional[float]:
    m = re.search(BALANCE_PATTERN, text, re.IGNORECASE)
    if m:
        return float(m.group(1).replace(",", ""))
    return None


def _extract_date(text: str) -> Optional[datetime]:
    for pattern in DATE_PATTERNS:
        m = re.search(pattern, text)
        if m:
            date_str = m.group(1)
            for fmt in ("%d/%m/%Y", "%d-%m-%Y", "%d/%m/%y", "%d-%m-%y", "%d %b %Y"):
                try:
                    return datetime.strptime(date_str, fmt)
                except ValueError:
                    continue
    return None


def parse_sms(sms_text: str, received_at: Optional[datetime] = None) -> Optional[ParsedTransaction]:
    """
    Parse Indian bank SMS and return structured transaction data.
    Returns None if the SMS doesn't look like a transaction message.
    """
    text = sms_text.strip()
    amount = _extract_amount(text)
    if amount is None or amount <= 0:
        return None

    txn_type, type_confidence = _extract_type(text)
    if txn_type is None:
        return None

    merchant = _extract_merchant(text)
    bank = _extract_bank(text)
    account_last4 = _extract_account(text)
    balance = _extract_balance(text)
    txn_date = _extract_date(text) or received_at or datetime.utcnow()

    overall_confidence = round(type_confidence * (0.9 if merchant else 0.7), 3)

    return ParsedTransaction(
        amount=amount,
        type=txn_type,
        merchant=merchant,
        bank=bank,
        account_last4=account_last4,
        balance=balance,
        transaction_date=txn_date,
        raw_sms=text,
        confidence=overall_confidence,
    )
