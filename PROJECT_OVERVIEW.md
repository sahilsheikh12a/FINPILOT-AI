# FinPilot AI — Project Overview

## What It Is

An AI-powered personal finance app built for Indian users. Think of it as a smart money manager that reads your bank SMS, understands your spending, predicts problems, and lets you chat with an AI about your finances.

---

## Architecture

```
React Native App (mobile)
        ↓
FastAPI Backend (Python)
        ↓
┌─────────────────┬──────────────────┐
│   ML Pipelines  │  LangGraph Agents│
└─────────────────┴──────────────────┘
        ↓
   PostgreSQL + Redis
```

---

## Backend — What Each Part Does

### 1. Auth (`/auth`)
JWT-based login/register using phone number. Standard fintech auth flow.

### 2. SMS Parser (`ml/pipelines/sms_parser.py`)
Regex engine that reads raw Indian bank SMS like:
> *"INR 2,500 debited from HDFC A/c XX1234 at Swiggy on 15/04/2026"*

Extracts: amount, debit/credit, merchant, bank, account, date. Supports HDFC, SBI, ICICI, Axis, Kotak, Paytm, PhonePe, GPay.

### 3. Expense Classifier (`ml/pipelines/expense_classifier.py`)
Takes a transaction description → outputs category (food, travel, bills, EMI, shopping, etc.).
Uses TF-IDF + XGBoost when trained, falls back to keyword rules when no model exists.

### 4. Overspend Predictor (`ml/pipelines/overspend_predictor.py`)
Looks at how fast you're spending mid-month, extrapolates to end of month, returns a probability (0–1) that you'll exceed your budget. Works via heuristic even without a trained model.

### 5. Fraud Detector (`ml/pipelines/fraud_detector.py`)
Isolation Forest on transaction features (amount, time of day, day of week, z-score vs your history). Flags unusual transactions.

### 6. LangGraph Multi-Agent System (`app/agents/`)
This is the AI brain behind the chat feature:

```
User query
    → intent_router (LLM classifies: budget_check? spending_analysis? goal_advice?)
    → routes to one of 5 specialist agents
        - expense_agent      → analyzes spending patterns
        - budget_agent       → checks budget + overspend risk
        - goal_agent         → evaluates savings progress
        - emi_agent          → debt-to-income, EMI stress
        - subscription_agent → recurring charge detection
    → synthesizer (LLM combines outputs into final answer)
```

### 7. API Endpoints (`app/api/v1/endpoints/`)
8 routers covering everything: auth, transactions, budget, goals, EMIs, subscriptions, alerts, chat.

### 8. Database (`migrations/schema.sql`)
7 PostgreSQL tables: `users`, `transactions`, `budgets`, `goals`, `emis`, `subscriptions`, `alerts`. Full relationships, indexes, ENUMs for categories and statuses.

---

## Frontend — React Native Screens Built

| Screen | What It Shows |
|---|---|
| `LoginScreen` | Phone + password login |
| `DashboardScreen` | Budget ring, category pie chart, unread alerts count |
| `GoalsScreen` | Savings goals with progress bars |
| `EMIScreen` | Active loans, EMI amounts, stress score |
| `ChatScreen` | Chat UI with AI suggestions, streams responses |

Navigation uses bottom tabs. API calls use axios with JWT auto-attached via interceptor.

---

## What's Indian-Specific

- SMS parsing handles UPI, NEFT, IMPS patterns
- Categories include UPI, ATM, salary cycles
- Merchants include Swiggy, Zomato, Jio, Airtel, BigBasket, IRCTC, etc.
- EMI culture is a first-class feature (not an afterthought)
- Currency throughout is INR / ₹

---

## Current Completion Status

### Done (~70%)

| Feature | Status |
|---|---|
| FastAPI backend + auth (JWT) | ✅ Done |
| Full PostgreSQL schema (all 7 tables) | ✅ Done |
| SMS Parser (HDFC, SBI, ICICI, UPI, etc.) | ✅ Done |
| Expense Classifier (TF-IDF + XGBoost + rule fallback) | ✅ Done |
| Overspend Predictor (heuristic + model slot) | ✅ Done |
| Fraud Detector (Isolation Forest + heuristic) | ✅ Done |
| LangGraph multi-agent system (6 agents) | ✅ Done |
| All API endpoints (8 routers) | ✅ Done |
| SQLAlchemy ORM models (all 8 tables) | ✅ Done |
| React Native: Dashboard, Chat, Goals, EMI, Login | ✅ Done |
| Docker Compose | ✅ Done |

### Missing (~30%)

| Gap | Impact |
|---|---|
| `goal_service.py`, `subscription_service.py`, `alert_service.py` | Backend crashes on those endpoints |
| Frontend: no Transactions, Subscriptions, Alerts screens | Nav tab shows "Expenses" but no screen |
| `isAuthenticated` hardcoded to `false` in navigator | App always shows Login, never Main |
| ML models dir empty (`.gitkeep`) | Falls back to heuristics — works, but no trained models |
| No `.env` file (only `.env.example`) | App won't start without one |
| SECRET_KEY in `.env.example` is an actual OpenAI key | Security leak — must be replaced |

---

## In One Line

The skeleton is production-grade and architecturally sound. The AI/ML layer, agent system, DB schema, and most API logic are done. What's left is ~3 service files, 3 screens, and wiring auth state — then it can run end-to-end.
