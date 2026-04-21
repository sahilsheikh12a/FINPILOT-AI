# FinPilot AI — AI Personal Finance Copilot for Indian Users

A production-grade AI-powered fintech product with ML, LangGraph agents, and React Native mobile app.

---

## Architecture

```
Mobile App (React Native)
        ↓
FastAPI Backend (/api/v1)
        ↓
┌────────────────────────────────────────┐
│  Services Layer                        │
│  TransactionService | BudgetService    │
│  EMIService | ChatService             │
└────────────────────────────────────────┘
        ↓
┌──────────────────┐  ┌──────────────────┐
│  ML Pipelines    │  │  LangGraph Agents│
│  - SMS Parser    │  │  - Intent Router │
│  - Classifier    │  │  - Expense Agent │
│  - Fraud Detect  │  │  - Budget Agent  │
│  - Overspend     │  │  - Goal Agent    │
│    Predictor     │  │  - EMI Agent     │
└──────────────────┘  │  - Synthesizer   │
                      └──────────────────┘
        ↓
PostgreSQL + Redis
```

---

## Quick Start

### Prerequisites
- Python 3.12+
- PostgreSQL 16+
- Node.js 20+ & React Native CLI
- Docker (optional)

---

### Backend Setup

```bash
cd backend

# Copy and fill in your API keys
cp .env.example .env
# Edit .env — set GEMINI_API_KEY or OPENAI_API_KEY

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start PostgreSQL (or use Docker)
docker run -d \
  -e POSTGRES_USER=finpilot \
  -e POSTGRES_PASSWORD=finpilot \
  -e POSTGRES_DB=finpilot_db \
  -p 5432:5432 postgres:16-alpine

# Run the API (tables auto-created on startup)
uvicorn app.main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

### Load seed data (optional)
```bash
psql -U finpilot -d finpilot_db -f migrations/seed_data.sql
```
Seed user: `+919876543210` / password: `Test@1234`

---

### Docker Compose (full stack)

```bash
cd infra
cp ../backend/.env.example ../backend/.env
# Edit .env

docker compose up -d
```

---

### Run Tests

```bash
cd backend
pytest tests/ -v
```

---

### Frontend Setup

```bash
cd frontend
npm install

# Android
npm run android

# iOS
npm run ios
```

> For Android emulator: the API URL is `http://10.0.2.2:8000/api/v1` (points to host machine).
> For physical device: update `BASE_URL` in `src/services/api.ts` to your machine's local IP.

---

## Features

| Feature | Status |
|---|---|
| SMS Transaction Parser | ✅ Rule-based + ML |
| Expense Auto-Categorization | ✅ TF-IDF + XGBoost (rule fallback) |
| AI Budget Planner | ✅ 50/30/20 adapted for India |
| Overspend Prediction | ✅ ML + heuristic fallback |
| Goal-Based Savings Planner | ✅ |
| EMI / Debt Analyzer | ✅ Stress scoring |
| Subscription Leak Detector | ✅ |
| AI Chat Copilot | ✅ LangGraph multi-agent |
| Fraud Detection | ✅ Isolation Forest |
| Push Notifications | 🔧 Firebase (wired, needs creds) |

---

## API Reference

All routes prefixed with `/api/v1/`

| Method | Endpoint | Description |
|---|---|---|
| POST | /auth/register | Register new user |
| POST | /auth/login | Login, get JWT |
| POST | /transactions/parse-sms | Parse bank SMS |
| POST | /transactions/ | Manual transaction |
| GET | /transactions/ | List transactions |
| GET | /transactions/summary/monthly | Monthly summary |
| POST | /budget/generate | AI-generate budget |
| GET | /budget/current | Current month budget |
| GET | /goals/ | List goals |
| POST | /goals/ | Create goal |
| GET | /emis/stress | EMI stress analysis |
| POST | /emis/ | Add EMI |
| GET | /subscriptions/ | Subscription summary |
| POST | /chat/ | AI Chat |
| GET | /alerts/ | Get alerts |

---

## Environment Variables

```env
DATABASE_URL=postgresql+asyncpg://finpilot:finpilot@localhost:5432/finpilot_db
SECRET_KEY=your-32-char-secret
LLM_PROVIDER=gemini          # or openai
GEMINI_API_KEY=your-key
REDIS_URL=redis://localhost:6379
```

---

## Tech Stack

- **Backend**: FastAPI + SQLAlchemy 2.0 (async) + PostgreSQL
- **ML**: Scikit-learn, XGBoost, Isolation Forest
- **AI Agents**: LangGraph + LangChain (Gemini / OpenAI)
- **Frontend**: React Native (TypeScript) + Zustand + React Navigation
- **Infra**: Docker Compose, Redis
