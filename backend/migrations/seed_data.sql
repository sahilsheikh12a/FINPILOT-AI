-- Sample seed data for testing FinPilot AI

-- Test user (password: Test@1234)
INSERT INTO users (id, phone, email, name, hashed_password, monthly_income, city)
VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    '+919876543210',
    'rahul@example.com',
    'Rahul Sharma',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/lewFWgbQYnJfn.Wby', -- Test@1234
    75000,
    'Bangalore'
);

-- Budget for current month
INSERT INTO budgets (user_id, month, year, total_budget, category_limits, savings_target, ai_generated)
VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    EXTRACT(MONTH FROM NOW())::int,
    EXTRACT(YEAR FROM NOW())::int,
    48000,
    '{"food": 12000, "travel": 6000, "bills": 9000, "emi": 12000, "shopping": 4800, "entertainment": 3000, "health": 3000}',
    15000,
    true
);

-- Sample transactions (last 30 days)
INSERT INTO transactions (user_id, amount, type, category, merchant, transacted_at) VALUES
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 450, 'debit', 'food', 'Swiggy', NOW() - INTERVAL '1 day'),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 1200, 'debit', 'travel', 'Ola Cabs', NOW() - INTERVAL '2 days'),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 75000, 'credit', 'salary', 'Company Payroll', NOW() - INTERVAL '3 days'),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 15000, 'debit', 'emi', 'HDFC Bank', NOW() - INTERVAL '5 days'),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 899, 'debit', 'entertainment', 'Netflix', NOW() - INTERVAL '7 days'),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 2500, 'debit', 'shopping', 'Amazon', NOW() - INTERVAL '8 days'),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 650, 'debit', 'food', 'Zomato', NOW() - INTERVAL '9 days'),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 3200, 'debit', 'bills', 'Airtel Postpaid', NOW() - INTERVAL '10 days'),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 149, 'debit', 'entertainment', 'Spotify', NOW() - INTERVAL '12 days'),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 500, 'debit', 'health', 'Apollo Pharmacy', NOW() - INTERVAL '14 days'),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 1800, 'debit', 'food', 'Restaurant Dinner', NOW() - INTERVAL '15 days'),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 4999, 'debit', 'shopping', 'Myntra', NOW() - INTERVAL '16 days');

-- EMI
INSERT INTO emis (user_id, loan_name, lender, principal, emi_amount, interest_rate, tenure_months, paid_months, start_date, due_day)
VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'Home Loan',
    'HDFC Bank',
    2500000,
    15000,
    8.5,
    240,
    24,
    '2022-05-01',
    5
);

-- Goals
INSERT INTO goals (user_id, name, description, target_amount, saved_amount, monthly_saving_required, target_date)
VALUES
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'MacBook Pro', 'For side projects', 150000, 45000, 10500, '2025-12-31'),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Emergency Fund', '6 months expenses', 300000, 120000, 15000, NULL);

-- Subscriptions
INSERT INTO subscriptions (user_id, name, amount, billing_cycle, category, is_active)
VALUES
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Netflix', 899, 'monthly', 'entertainment', true),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Spotify', 149, 'monthly', 'entertainment', true),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Amazon Prime', 1499, 'yearly', 'entertainment', true),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Airtel Broadband', 999, 'monthly', 'bills', true),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Google One', 130, 'monthly', 'other', true);
