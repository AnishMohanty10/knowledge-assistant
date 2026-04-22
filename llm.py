import os
from typing import List, Dict, Any
from huggingface_hub import InferenceClient
from dotenv import load_dotenv

load_dotenv()

def build_prompt(query: str, chunks: List[Dict[str, Any]], chat_history: List[Dict[str, str]] = None) -> List[Dict[str, str]]:
    """Constructs system prompt with context and appends chat history."""
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
            "You are a helpful AI assistant. You answer questions ONLY based on the provided context. "
            "If the answer is not contained in the context, explicitly say 'I don't know based on the provided context.' "
            "When providing an answer, formulate it clearly and cite the sources used.\n\n"
            f"PROVIDED CONTEXT:\n{context_str}"
        )
    }
    
    messages = [system_message]
    
    # Append chat history
    for msg in chat_history:
        messages.append({"role": msg["role"], "content": msg["content"]})
        
    # Append current query
    messages.append({"role": "user", "content": query})
    
    return messages

def ask_llm(query: str, chunks: List[Dict[str, Any]], chat_history: List[Dict[str, str]] = None) -> Dict[str, Any]:
    """Generates an answer using Hugging Face API based on the retrieved chunks."""
    try:
        # Check both since HF_TOKEN might be assigned to OPENAI_API_KEY
        api_key = os.getenv("HF_TOKEN") or os.getenv("OPENAI_API_KEY") 
        if not api_key or api_key == "your_openai_api_key_here":
            return {"answer": "Error: Hugging Face API token is missing in .env", "sources": []}
            
        client = InferenceClient(api_key=api_key)
        messages = build_prompt(query, chunks, chat_history)
        
        response = client.chat_completion(
            model="Qwen/Qwen2.5-7B-Instruct",
            messages=messages,
            max_tokens=500
        )
        
        answer = response.choices[0].message.content
        sources = list(set([str(chunk.get("source", "Unknown")) for chunk in chunks]))
        
        return {"answer": str(answer), "sources": sources}
    except Exception as e:
        return {"answer": f"Error calling Hugging Face LLM: {str(e)}", "sources": []}
