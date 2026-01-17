import os
import requests
from typing import List, Optional, TypedDict
from pydantic import BaseModel, Field
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.tools import tool
from dotenv import load_dotenv
from langgraph.graph import END, START, StateGraph
from langgraph.checkpoint.memory import MemorySaver

load_dotenv()

if not os.getenv("GOOGLE_API_KEY"):
    raise ValueError("GOOGLE_API_KEY not found!")

flash_model = ChatGoogleGenerativeAI(model="gemini-2.0-flash", temperature=0, max_retries=2)
pro_model = ChatGoogleGenerativeAI(model="gemini-2.0-flash", temperature=0)
class SentimentScore(BaseModel):
    sentiment_score: float = Field(description="Float 0.0 to 1.0. 0=Hostile/Dangerous, 1=Safe/Supportive")
    reason: str = Field(description="Concise evidence citing specific words")

class UrgencyScore(BaseModel):
    urgency_score: float = Field(description="Float 0.0 to 1.0. 1=Immediate Emergency")
    reason: str = Field(description="Keywords indicating time-sensitivity")

class SeverityScore(BaseModel):
    severity_score: float = Field(description="Float 0.0 to 1.0. 1=Direct Threat/Violence")
    reason: str = Field(description="Specific threat category detected")

class FinalScore(BaseModel):
    final_safety_score: float = Field(description="Float 1.0 to 10.0")
    trigger_sos: bool = Field(description="TRUE only for immediate physical danger.")
    reason: str = Field(description="Detailed verdict.")
    sos_context: str = Field(description="Context for database logs.")
@tool
def log_sos_event(route_id: str, user_id: str, context: str, score: float):
    """Logs a CRITICAL SOS event (Life Threatening) to backend."""
    try:
        backend_url = os.getenv("BACKEND_URL", "http://localhost:3000")
        response = requests.post(f"{backend_url}/api/room/log-sos", json={
            "routeId": route_id, "userId": user_id, "context": context, "score": score, "severity": "CRITICAL"
        }, timeout=3)
        return f"SOS Logged: {response.status_code}"
    except Exception as e: return f"SOS Fail: {str(e)}"

@tool
def log_suspicious_event(route_id: str, user_id: str, context: str, score: float):
    """Logs SUSPICIOUS/HARASSMENT behavior (Non-Emergency) to backend."""
    try:
        backend_url = os.getenv("BACKEND_URL", "http://localhost:3000")
        response = requests.post(f"{backend_url}/api/room/log-suspicious", json={
            "routeId": route_id, "userId": user_id, "context": context, "score": score, "severity": "MODERATE"
        }, timeout=3)
        return f"Suspicious Logged: {response.status_code}"
    except Exception as e: return f"Suspicious Fail: {str(e)}"

class FrontendMessage(BaseModel):
    userId: str
    message: str

class GraphState(TypedDict):
    roomId: str
    messages: List[FrontendMessage] 
    currentUserMessage: str
    currentUserId: str
    model_1: Optional[SentimentScore]
    model_2: Optional[UrgencyScore]
    model_3: Optional[SeverityScore]
    final_model_score: Optional[FinalScore]
    tool_logs: Optional[List[str]]

sentiment_engine = flash_model.with_structured_output(SentimentScore)
urgency_engine = flash_model.with_structured_output(UrgencyScore)
severity_engine = flash_model.with_structured_output(SeverityScore)
final_engine = pro_model.with_structured_output(FinalScore)

def get_history_str(messages: List[FrontendMessage]) -> str:
    raw = messages[-6:] 
    return "\n".join([f"[{m.userId}]: {m.message}" for m in raw]) if raw else "No history."


async def analyze_sentiment(state: GraphState):
    history = get_history_str(state["messages"])
    current = state["currentUserMessage"]
    
    prompt = f"""
    ROLE: Forensic Psycholinguist.
    TASK: Analyze the emotional tone and intent of the CURRENT MESSAGE within the context of the chat.
    
    CONTEXT (History):
    {history}
    
    CURRENT MESSAGE:
    "{current}"
    
    RUBRIC (0.0 - 1.0):
    - 0.0: Aggressive, Hateful, Predator-like, Manipulative.
    - 0.5: Neutral, Transactional, Bored.
    - 1.0: Supportive, Friendly, Respectful.
    
    RULES:
    - Ignore profanity if used playfully between friends (check history).
    - Flag sudden shifts from friendly to aggressive as LOW score.
    """
    result = await sentiment_engine.ainvoke(prompt)
    return {"model_1": result}

async def analyze_urgency(state: GraphState):
    history = get_history_str(state["messages"])
    current = state["currentUserMessage"]
    
    prompt = f"""
    ROLE: 911 Emergency Dispatcher AI.
    TASK: Detect immediate time-sensitive threats in the CURRENT MESSAGE.
    
    CONTEXT (History):
    {history}
    
    CURRENT MESSAGE:
    "{current}"
    
    RUBRIC (0.0 - 1.0):
    - 1.0 (CRITICAL): "Help", "Police", "Followed", "Scared", "Where are you taking me".
    - 0.8 (HIGH): "Stop it", "Leave me alone" (Repeatedly).
    - 0.0 (NONE): Casual chat, "Call me later", "I'm running late".
    
    RULES:
    - Context is key. "I'm dying of laughter" is 0.0. "I'm dying, help" is 1.0.
    """
    result = await urgency_engine.ainvoke(prompt)
    return {"model_2": result}

async def analyze_severity(state: GraphState):
    history = get_history_str(state["messages"])
    current = state["currentUserMessage"]
    
    prompt = f"""
    ROLE: Threat Intelligence Analyst.
    TASK: Classify the specific category of harm in the CURRENT MESSAGE.
    
    CONTEXT (History):
    {history}
    
    CURRENT MESSAGE:
    "{current}"
    
    RUBRIC (0.0 - 1.0):
    - 1.0 (DANGER): Physical threats, kidnapping, sexual assault implication, stalking.
    - 0.6 (HARASSMENT): Slurs, persistent unwanted requests, sexual comments.
    - 0.2 (RUDE): Insults, arguments.
    - 0.0 (SAFE): Normal interaction.
    
    RULES:
    - If the user said "NO" or "STOP" in history and this message continues -> Severity > 0.7.
    """
    result = await severity_engine.ainvoke(prompt)
    return {"model_3": result}

async def final_judge(state: GraphState):
    history_str = get_history_str(state["messages"])
    current_msg = state["currentUserMessage"]
    s, u, sev = state["model_1"], state["model_2"], state["model_3"]
    
    prompt = f"""
    ROLE: Senior Safety Operations Director.
    GOAL: Synthesize expert reports to determine Final Safety Score (1-10) and Action Triggers.
    
    --- LIVE DATA ---
    CHAT HISTORY: {history_str}
    CURRENT MESSAGE: "{current_msg}"
    
    --- EXPERT FINDINGS ---
    1. SENTIMENT (0-1): {s.sentiment_score} -> {s.reason}
    2. URGENCY (0-1): {u.urgency_score} -> {u.reason}
    3. SEVERITY (0-1): {sev.severity_score} -> {sev.reason}
    
    --- DECISION MATRIX ---
    
    CASE A: [SOS TRIGGER = TRUE]
    - IF Urgency > 0.8 OR Severity > 0.9.
    - IF Explicit plea for help ("Call police").
    - SCORE MUST BE: 1.0 to 3.0.
    
    CASE B: [SUSPICIOUS/HARASSMENT LOGGING]
    - IF Severity > 0.5 OR Sentiment < 0.3.
    - IF Persistence after rejection.
    - SCORE MUST BE: 4.0 to 7.9.
    - TRIGGER SOS: FALSE.
    
    CASE C: [SAFE]
    - Normal conversation.
    - SCORE MUST BE: 8.0 to 10.0.
    - TRIGGER SOS: FALSE.
    
    OUTPUT: JSON with final score, SOS boolean, and detailed context.
    """
    result = await final_engine.ainvoke(prompt)
    return {"final_model_score": result}

async def sos_reporter(state: GraphState):
    decision = state["final_model_score"]
    log_result = log_sos_event.invoke({
        "route_id": state["roomId"], "user_id": state["currentUserId"],
        "context": decision.sos_context, "score": decision.final_safety_score
    })
    return {"tool_logs": [log_result]}

async def suspicious_reporter(state: GraphState):
    decision = state["final_model_score"]
    print(f"⚠️ SUSPICIOUS ACTIVITY detected. Logging to specialized DB...")
    log_result = log_suspicious_event.invoke({
        "route_id": state["roomId"], "user_id": state["currentUserId"],
        "context": decision.sos_context, "score": decision.final_safety_score
    })
    return {"tool_logs": [log_result]}
def route_decision(state: GraphState):
    decision = state["final_model_score"]
    score = decision.final_safety_score
    if decision.trigger_sos:
        return "report_sos"
    elif score < 8.0: 
        return "report_suspicious"

    return "finalize"
graph = StateGraph(GraphState)
graph.add_node("analyze_sentiment", analyze_sentiment)
graph.add_node("analyze_urgency", analyze_urgency)
graph.add_node("analyze_severity", analyze_severity)
graph.add_node("final_judge", final_judge)
graph.add_node("sos_reporter", sos_reporter)
graph.add_node("suspicious_reporter", suspicious_reporter)

graph.add_edge(START, "analyze_sentiment")
graph.add_edge(START, "analyze_urgency")
graph.add_edge(START, "analyze_severity")

graph.add_edge("analyze_sentiment", "final_judge")
graph.add_edge("analyze_urgency", "final_judge")
graph.add_edge("analyze_severity", "final_judge")

graph.add_conditional_edges(
    "final_judge",
    route_decision,
    {
        "report_sos": "sos_reporter",
        "report_suspicious": "suspicious_reporter",
        "finalize": END
    }
)

graph.add_edge("sos_reporter", END)
graph.add_edge("suspicious_reporter", END)

memory = MemorySaver()
app_graph = graph.compile(checkpointer=memory)