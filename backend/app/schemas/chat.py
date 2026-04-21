from pydantic import BaseModel
from typing import Optional
from uuid import UUID


class ChatMessage(BaseModel):
    message: str
    session_id: Optional[str] = None


class ChatResponse(BaseModel):
    reply: str
    session_id: str
    agent_used: Optional[str] = None
    data: Optional[dict] = None
