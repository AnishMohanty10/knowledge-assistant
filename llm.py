"""Module to bridge queries with HuggingFace/OpenAI generation."""
import os
import time
import logging
import re
from typing import List, Dict, Any
from huggingface_hub import InferenceClient

logger = logging.getLogger(__name__)

MAX_HISTORY_TOKENS = 2000
STOP_WORDS = {"the", "is", "at", "which", "on", "a", "an", "and"}

def extract_meaningful_words(text: str) -> set:
    """Normalizes text and strips stop words for ground-truth calculation."""
    words = re.findall(r'\b\w+\b', text.lower())
    return set([w for w in words if w not in STOP_WORDS])

def build_prompt(query: str, chunks: List[Dict[str, Any]], chat_history: List[Dict[str, str]] = None) -> List[Dict[str, str]]:
    """Constructs system prompt and trims chat history to prevent overflow.
    
    Args:
        query: The user's input string.
        chunks: List of document dictionaries providing context.
        chat_history: The list of prior messages in the active session.
        
    Returns:
        List of message dicts accepted by standard LLM APIs.
    """
    if chat_history is None:
        chat_history = []
        
    context_texts = []
    for i, chunk in enumerate(chunks, 1):
        source = chunk.get("source", "Unknown")
        text = chunk.get("text", "")
        context_texts.append(f"--- Context {i} (Source: {source}) ---\n{text}\n")
        
    context_str = "\n".join(context_texts)
    
    system_message = {
        "role": "system",
        "content": (
            "You are a document Q&A assistant. You MUST answer ONLY using the context chunks provided below. "
            "If the answer cannot be found in the provided context, you MUST respond with exactly: "
            "'I don't have information about that in your uploaded documents.' "
            "Never use your training data. Never speculate. Never infer beyond what is explicitly written.\n\n"
            f"PROVIDED CONTEXT:\n{context_str}"
        )
    }
    
    messages = [system_message]
    
    # Trim history to avoid TokenOverflow
    trimmed_history = []
    current_tokens = sum(len(msg["content"].split()) * 1.3 for msg in messages) + (len(query.split()) * 1.3)
    
    for msg in reversed(chat_history):
        msg_tokens = len(msg["content"].split()) * 1.3
        if current_tokens + msg_tokens <= MAX_HISTORY_TOKENS:
            trimmed_history.insert(0, msg)
            current_tokens += msg_tokens
        else:
            break
            
    for msg in trimmed_history:
        messages.append({"role": msg["role"], "content": msg["content"]})
        
    messages.append({"role": "user", "content": query})
    return messages

def ask_llm(query: str, chunks: List[Dict[str, Any]], chat_history: List[Dict[str, str]] = None) -> Dict[str, Any]:
    """Generates an answer with HuggingFace, calculating explicit factual grounding.
    
    Args:
        query: Current user query.
        chunks: Pulled vector contexts.
        chat_history: Previous conversations.
        
    Returns:
        Dictionary mapping answer out, references, and boolean boolean ground checks.
    """
    if not chunks:
        logger.info("No chunks provided to LLM, enforcing fallback response.")
        return {"answer": "I don't have information about that in your uploaded documents.", "sources": [], "grounded": True}
        
    try:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            api_key = os.getenv("HF_TOKEN")
        
        if not api_key:
            return {"answer": "Error: Valid API key is missing.", "sources": [], "grounded": False}
            
        client = InferenceClient(api_key=api_key)
        messages = build_prompt(query, chunks, chat_history)
        
        # Robust Generation Request
        max_retries = 3
        answer = ""
        for attempt in range(max_retries):
            try:
                response = client.chat_completion(
                    model="Qwen/Qwen2.5-7B-Instruct",
                    messages=messages,
                    max_tokens=500
                )
                answer = response.choices[0].message.content
                break
            except Exception as e:
                logger.warning(f"LLM attempt {attempt+1} failed: {e}")
                if attempt == max_retries - 1:
                    raise e
                time.sleep(2 ** attempt)

        # Grounding Audit
        answer_words = extract_meaningful_words(answer)
        context_corpus = " ".join([chunk.get("text", "") for chunk in chunks])
        context_words = extract_meaningful_words(context_corpus)
        
        shared_words = answer_words.intersection(context_words)
        grounded = True
        
        if len(answer_words) > 0:
            overlap = len(shared_words) / len(answer_words)
            if overlap < 0.15:
                grounded = False
                logger.warning("Agent triggered Hallucination threshold (overlap < 15%)")
                
        sources = list(set([str(chunk.get("source", "Unknown")) for chunk in chunks]))
        
        return {"answer": str(answer), "sources": sources, "grounded": grounded}
    except Exception as e:
        logger.error(f"Error generation: {str(e)}")
        return {"answer": f"Generation Error: {str(e)}", "sources": [], "grounded": False}
