"""
LangGraph nodes for each specialized financial agent.
Each node receives AgentState, performs its analysis, and returns state updates.
"""
from langchain_core.messages import HumanMessage, SystemMessage
from app.agents.state import AgentState
from app.agents.llm import get_llm

INTENT_CLASSIFIER_PROMPT = """You are a financial intent classifier. Given a user query,
classify the intent into ONE of:
[budget_check, spending_analysis, goal_advice, emi_analysis, savings_advice,
 fraud_check, subscription_review, affordability_check, general]

Respond with ONLY the intent label, nothing else."""


def intent_router(state: AgentState) -> AgentState:
    """Classify user query intent to route to the right agent(s)."""
    llm = get_llm()
    response = llm.invoke([
        SystemMessage(content=INTENT_CLASSIFIER_PROMPT),
        HumanMessage(content=state["user_query"]),
    ])
    intent = response.content.strip().lower()
    valid_intents = {
        "budget_check", "spending_analysis", "goal_advice", "emi_analysis",
        "savings_advice", "fraud_check", "subscription_review",
        "affordability_check", "general"
    }
    if intent not in valid_intents:
        intent = "general"
    return {**state, "intent": intent}


def expense_agent(state: AgentState) -> AgentState:
    """Analyzes spending patterns from financial context."""
    ctx = state.get("financial_context", {})
    txn_data = ctx.get("transactions", {})
    category_spend = txn_data.get("category_breakdown", {})
    total_spend = txn_data.get("total_debit", 0)

    analysis = {
        "total_spend": total_spend,
        "top_categories": sorted(category_spend.items(), key=lambda x: x[1], reverse=True)[:5],
        "category_breakdown": category_spend,
    }

    responses = state.get("agent_responses") or {}
    responses["expense"] = analysis
    return {**state, "agent_responses": responses}


def budget_agent(state: AgentState) -> AgentState:
    """Checks budget status and overspend risk."""
    ctx = state.get("financial_context", {})
    budget_data = ctx.get("budget", {})
    prediction = ctx.get("overspend_prediction", {})

    analysis = {
        "budget": budget_data.get("total_budget", 0),
        "spent": budget_data.get("spent_so_far", 0),
        "remaining": budget_data.get("remaining", 0),
        "overspend_risk": prediction.get("risk_level", "unknown"),
        "overspend_probability": prediction.get("probability", 0),
    }

    responses = state.get("agent_responses") or {}
    responses["budget"] = analysis
    return {**state, "agent_responses": responses}


def goal_agent(state: AgentState) -> AgentState:
    """Evaluates goal progress and savings capacity."""
    ctx = state.get("financial_context", {})
    goals = ctx.get("goals", [])
    income = ctx.get("user", {}).get("monthly_income", 0)
    total_spend = ctx.get("transactions", {}).get("total_debit", 0)
    available_for_savings = max(0, income - total_spend)

    analysis = {
        "goals": goals,
        "available_for_savings": available_for_savings,
        "savings_rate": round(available_for_savings / income * 100, 1) if income else 0,
    }

    responses = state.get("agent_responses") or {}
    responses["goal"] = analysis
    return {**state, "agent_responses": responses}


def emi_agent(state: AgentState) -> AgentState:
    """Analyzes EMI burden and debt-to-income ratio."""
    ctx = state.get("financial_context", {})
    emi_data = ctx.get("emis", {})

    responses = state.get("agent_responses") or {}
    responses["emi"] = emi_data
    return {**state, "agent_responses": responses}


def subscription_agent(state: AgentState) -> AgentState:
    """Identifies subscription spending and potential savings."""
    ctx = state.get("financial_context", {})
    subs = ctx.get("subscriptions", [])
    total_monthly = sum(
        s.get("amount", 0) for s in subs if s.get("billing_cycle") == "monthly" and s.get("is_active")
    )

    analysis = {
        "subscriptions": subs,
        "total_monthly_cost": total_monthly,
        "count": len(subs),
    }

    responses = state.get("agent_responses") or {}
    responses["subscription"] = analysis
    return {**state, "agent_responses": responses}


SYNTHESIZER_SYSTEM = """You are FinPilot, an AI personal finance copilot for Indian users.
You have access to the user's real financial data. Be concise, practical, and empathetic.
Use Indian context (₹, EMI culture, UPI, salary on 1st/last of month).
Give actionable advice. Format nicely but avoid markdown tables in chat.
Never make up numbers — use only the data provided."""


def synthesizer(state: AgentState) -> AgentState:
    """Combines all agent outputs and generates final LLM response."""
    llm = get_llm()
    ctx = state.get("financial_context", {})
    agent_data = state.get("agent_responses") or {}
    intent = state.get("intent", "general")

    context_summary = f"""
User Financial Context:
- Monthly Income: ₹{ctx.get('user', {}).get('monthly_income', 'unknown')}
- Intent: {intent}
- Agent Analysis: {agent_data}
"""

    response = llm.invoke([
        SystemMessage(content=SYNTHESIZER_SYSTEM),
        HumanMessage(content=f"{context_summary}\n\nUser Question: {state['user_query']}"),
    ])

    return {**state, "final_answer": response.content}
