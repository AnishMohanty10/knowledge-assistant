"""Module to bridge queries with OpenRouter generation."""
import os
import logging
from typing import List, Dict, Any
from openai import OpenAI
from dotenv import load_dotenv
load_dotenv()

logger = logging.getLogger(__name__)

client = OpenAI(
    api_key=os.getenv("OPENAI_API_KEY"),
    base_url="https://openrouter.ai/api/v1"
)

def ask_llm(query: str, chunks: List[Dict[str, Any]], history: List[Dict[str, str]] = None) -> Dict[str, Any]:
    try:
        if not chunks:
            logger.info("No chunks provided to LLM, enforcing fallback response.")
            return {"answer": "I don't have information about that in your uploaded documents.", "sources": [], "grounded": True}
            
        context = "\n\n".join([c.get("text", "") for c in chunks])

        response = client.chat.completions.create(
            model="qwen/qwen-2.5-7b-instruct",
            messages=[
                {
                    "role": "system",
                    "content": "Answer ONLY from provided context. If not found, say 'Not in documents'."
                },
                {
                    "role": "user",
                    "content": f"Context:\n{context}\n\nQuestion: {query}"
                }
            ]
        )

        sources = list(set([str(chunk.get("source", "Unknown")) for chunk in chunks]))

        return {
            "answer": response.choices[0].message.content,
            "sources": sources,
            "grounded": True
        }
    except Exception as e:
        logger.error(f"Error generation: {str(e)}")
        return {"answer": f"Generation Error: {str(e)}", "sources": [], "grounded": False}
