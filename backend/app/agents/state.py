from typing import TypedDict, Annotated, Optional, Any
from langgraph.graph.message import add_messages


class AgentState(TypedDict):
    user_id: str
    messages: Annotated[list, add_messages]
    user_query: str
    intent: Optional[str]
    financial_context: Optional[dict]
    agent_responses: Optional[dict]
    final_answer: Optional[str]
    error: Optional[str]
