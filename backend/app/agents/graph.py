"""
LangGraph multi-agent orchestration for FinPilot AI Chat.
Routes user queries to specialized agents based on detected intent.
"""
from langgraph.graph import StateGraph, END

from app.agents.state import AgentState
from app.agents.nodes import (
    intent_router,
    expense_agent,
    budget_agent,
    goal_agent,
    emi_agent,
    subscription_agent,
    synthesizer,
)


def route_by_intent(state: AgentState) -> str:
    """Conditional edge: route to appropriate agent based on intent."""
    intent = state.get("intent", "general")
    routing = {
        "spending_analysis": "expense_agent",
        "budget_check": "budget_agent",
        "goal_advice": "goal_agent",
        "savings_advice": "goal_agent",
        "emi_analysis": "emi_agent",
        "subscription_review": "subscription_agent",
        "affordability_check": "budget_agent",
        "general": "expense_agent",
        "fraud_check": "expense_agent",
    }
    return routing.get(intent, "expense_agent")


def build_graph() -> StateGraph:
    graph = StateGraph(AgentState)

    # Nodes
    graph.add_node("intent_router", intent_router)
    graph.add_node("expense_agent", expense_agent)
    graph.add_node("budget_agent", budget_agent)
    graph.add_node("goal_agent", goal_agent)
    graph.add_node("emi_agent", emi_agent)
    graph.add_node("subscription_agent", subscription_agent)
    graph.add_node("synthesizer", synthesizer)

    # Entry
    graph.set_entry_point("intent_router")

    # Conditional routing after intent classification
    graph.add_conditional_edges(
        "intent_router",
        route_by_intent,
        {
            "expense_agent": "expense_agent",
            "budget_agent": "budget_agent",
            "goal_agent": "goal_agent",
            "emi_agent": "emi_agent",
            "subscription_agent": "subscription_agent",
        },
    )

    # All agents converge to synthesizer
    for agent in ["expense_agent", "budget_agent", "goal_agent", "emi_agent", "subscription_agent"]:
        graph.add_edge(agent, "synthesizer")

    graph.add_edge("synthesizer", END)

    return graph.compile()


# Compiled graph singleton
_compiled_graph = None


def get_graph():
    global _compiled_graph
    if _compiled_graph is None:
        _compiled_graph = build_graph()
    return _compiled_graph
