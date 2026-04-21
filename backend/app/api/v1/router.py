from fastapi import APIRouter

from app.api.v1.endpoints import auth, transactions, budget, goals, emis, subscriptions, chat, alerts

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(transactions.router)
api_router.include_router(budget.router)
api_router.include_router(goals.router)
api_router.include_router(emis.router)
api_router.include_router(subscriptions.router)
api_router.include_router(chat.router)
api_router.include_router(alerts.router)
