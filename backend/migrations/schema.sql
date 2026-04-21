-- FinPilot AI — PostgreSQL Schema
-- Run this manually OR let SQLAlchemy auto-create via lifespan

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone VARCHAR(15) NOT NULL UNIQUE,
    email VARCHAR(255) UNIQUE,
    name VARCHAR(100) NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    monthly_income NUMERIC(12,2),
    city VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_users_phone ON users(phone);

-- Transactions
CREATE TYPE transaction_type AS ENUM ('debit', 'credit');
CREATE TYPE transaction_category AS ENUM (
    'food','travel','bills','emi','shopping','entertainment',
    'health','education','salary','investment','transfer','upi','atm','other'
);

CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount NUMERIC(12,2) NOT NULL,
    type transaction_type NOT NULL,
    category transaction_category DEFAULT 'other',
    merchant VARCHAR(255),
    description TEXT,
    raw_sms TEXT,
    sms_hash VARCHAR(64),
    sms_sender VARCHAR(32),
    bank VARCHAR(50),
    account_last4 VARCHAR(4),
    is_recurring BOOLEAN DEFAULT FALSE,
    is_fraud_flagged BOOLEAN DEFAULT FALSE,
    fraud_score NUMERIC(4,3),
    ml_confidence NUMERIC(4,3),
    meta JSONB,
    transacted_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_transactions_user_transacted ON transactions(user_id, transacted_at DESC);
CREATE INDEX IF NOT EXISTS ix_transactions_user_category ON transactions(user_id, category);
CREATE INDEX IF NOT EXISTS ix_transactions_sms_hash ON transactions(sms_hash);
ALTER TABLE transactions ADD CONSTRAINT uq_transactions_user_sms_hash UNIQUE (user_id, sms_hash);

-- Budgets
CREATE TABLE IF NOT EXISTS budgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    year INTEGER NOT NULL,
    total_budget NUMERIC(12,2) NOT NULL,
    category_limits JSONB DEFAULT '{}',
    savings_target NUMERIC(12,2),
    ai_generated BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, month, year)
);

-- Goals
CREATE TYPE goal_status AS ENUM ('active', 'completed', 'paused', 'cancelled');

CREATE TABLE IF NOT EXISTS goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    target_amount NUMERIC(12,2) NOT NULL,
    saved_amount NUMERIC(12,2) DEFAULT 0,
    monthly_saving_required NUMERIC(12,2),
    target_date DATE,
    status goal_status DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- EMIs
CREATE TYPE emi_status AS ENUM ('active', 'closed', 'defaulted');

CREATE TABLE IF NOT EXISTS emis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    loan_name VARCHAR(100) NOT NULL,
    lender VARCHAR(100),
    principal NUMERIC(12,2) NOT NULL,
    emi_amount NUMERIC(10,2) NOT NULL,
    interest_rate NUMERIC(5,2) NOT NULL,
    tenure_months INTEGER NOT NULL,
    paid_months INTEGER DEFAULT 0,
    start_date DATE NOT NULL,
    end_date DATE,
    due_day INTEGER DEFAULT 5,
    status emi_status DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Subscriptions
CREATE TYPE billing_cycle AS ENUM ('monthly', 'quarterly', 'yearly');

CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    billing_cycle billing_cycle DEFAULT 'monthly',
    next_billing_date DATE,
    category VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    auto_detected BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Alerts
CREATE TYPE alert_type AS ENUM (
    'budget_exceeded', 'budget_warning', 'overspend_predicted',
    'emi_due', 'subscription_renewal', 'fraud_detected',
    'goal_milestone', 'salary_credited'
);

CREATE TABLE IF NOT EXISTS alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type alert_type NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    meta JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_alerts_user_created ON alerts(user_id, created_at DESC);
