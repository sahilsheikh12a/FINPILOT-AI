import hashlib
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.repositories.transaction import TransactionRepository
from app.models.transaction import Transaction, TransactionType, TransactionCategory
from app.ml.pipelines.sms_parser import parse_sms
from app.ml.pipelines.expense_classifier import get_classifier
from app.ml.pipelines.fraud_detector import get_detector
from app.schemas.transaction import SMSParseRequest, TransactionCreate, SMSBatchRequest


def _sms_hash(sender: str | None, sms_text: str) -> str:
    key = f"{(sender or '').strip().upper()}|{sms_text.strip()}"
    return hashlib.sha256(key.encode("utf-8")).hexdigest()


class TransactionService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = TransactionRepository(db)
        self.classifier = get_classifier()
        self.detector = get_detector()

    async def parse_and_save_sms(
        self, user_id: UUID, request: SMSParseRequest
    ) -> Transaction | None:
        sms_hash = _sms_hash(request.sender, request.sms_text)
        existing = await self.repo.get_existing_sms_hashes(user_id, [sms_hash])
        if sms_hash in existing:
            return None

        parsed = parse_sms(request.sms_text, request.received_at)
        if not parsed:
            return None

        category_str, ml_confidence = self.classifier.classify(
            parsed.raw_sms, parsed.merchant
        )
        try:
            category = TransactionCategory(category_str)
        except ValueError:
            category = TransactionCategory.OTHER

        history_txns = await self.repo.get_recent_for_fraud_check(user_id)
        history_dicts = [
            {"amount": t.amount, "transacted_at": t.transacted_at}
            for t in history_txns
        ]
        fraud_score, is_fraud = self.detector.score(
            {"amount": parsed.amount, "transacted_at": parsed.transaction_date},
            history_dicts,
        )

        txn = await self.repo.create(
            user_id=user_id,
            amount=parsed.amount,
            type=TransactionType(parsed.type),
            category=category,
            merchant=parsed.merchant,
            bank=parsed.bank,
            account_last4=parsed.account_last4,
            raw_sms=parsed.raw_sms,
            sms_hash=sms_hash,
            sms_sender=request.sender,
            ml_confidence=ml_confidence,
            fraud_score=fraud_score,
            is_fraud_flagged=is_fraud,
            transacted_at=parsed.transaction_date,
        )
        return txn

    async def parse_and_save_sms_batch(
        self, user_id: UUID, request: SMSBatchRequest
    ) -> dict:
        items_with_hash = [
            (item, _sms_hash(item.sender, item.sms_text))
            for item in request.messages
        ]
        hashes = [h for _, h in items_with_hash]
        existing = await self.repo.get_existing_sms_hashes(user_id, hashes)

        saved_ids: list[UUID] = []
        duplicates = 0
        unparseable = 0
        seen_in_batch: set[str] = set()

        history_txns = await self.repo.get_recent_for_fraud_check(user_id)
        history_dicts = [
            {"amount": t.amount, "transacted_at": t.transacted_at}
            for t in history_txns
        ]

        for item, h in items_with_hash:
            if h in existing or h in seen_in_batch:
                duplicates += 1
                continue
            parsed = parse_sms(item.sms_text, item.received_at)
            if not parsed:
                unparseable += 1
                seen_in_batch.add(h)
                continue

            category_str, ml_confidence = self.classifier.classify(
                parsed.raw_sms, parsed.merchant
            )
            try:
                category = TransactionCategory(category_str)
            except ValueError:
                category = TransactionCategory.OTHER

            fraud_score, is_fraud = self.detector.score(
                {"amount": parsed.amount, "transacted_at": parsed.transaction_date},
                history_dicts,
            )

            txn = await self.repo.create(
                user_id=user_id,
                amount=parsed.amount,
                type=TransactionType(parsed.type),
                category=category,
                merchant=parsed.merchant,
                bank=parsed.bank,
                account_last4=parsed.account_last4,
                raw_sms=parsed.raw_sms,
                sms_hash=h,
                sms_sender=item.sender,
                ml_confidence=ml_confidence,
                fraud_score=fraud_score,
                is_fraud_flagged=is_fraud,
                transacted_at=parsed.transaction_date,
            )
            saved_ids.append(txn.id)
            seen_in_batch.add(h)
            history_dicts.append(
                {"amount": parsed.amount, "transacted_at": parsed.transaction_date}
            )

        return {
            "received": len(request.messages),
            "saved": len(saved_ids),
            "duplicates": duplicates,
            "unparseable": unparseable,
            "saved_ids": saved_ids,
        }

    async def create_manual(
        self, user_id: UUID, data: TransactionCreate
    ) -> Transaction:
        category = data.category
        ml_confidence = None
        if not category:
            category_str, ml_confidence = self.classifier.classify(
                data.description or "", data.merchant or ""
            )
            try:
                category = TransactionCategory(category_str)
            except ValueError:
                category = TransactionCategory.OTHER

        return await self.repo.create(
            user_id=user_id,
            amount=data.amount,
            type=data.type,
            category=category,
            merchant=data.merchant,
            description=data.description,
            bank=data.bank,
            ml_confidence=ml_confidence,
            transacted_at=data.transacted_at,
        )

    async def get_monthly_summary(self, user_id: UUID, month: int, year: int) -> dict:
        total_debit = await self.repo.get_monthly_spend(user_id, month, year)
        category_breakdown = await self.repo.get_category_spend(user_id, month, year)

        return {
            "month": month,
            "year": year,
            "total_debit": total_debit,
            "category_breakdown": category_breakdown,
        }
