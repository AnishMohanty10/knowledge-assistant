"""Utility functions for configuration and API requests."""
import os
import time
import logging
from typing import List
import requests
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

def load_env() -> None:
    """Validates and loads required environment variables.
    
    Raises:
        ValueError: If required environment variables are missing.
    """
    load_dotenv()
    required_vars = ["OPENAI_API_KEY", "HF_TOKEN"]
    missing = []
    
    for var in required_vars:
        if not os.getenv(var):
            missing.append(var)
            
    if missing:
        logger.critical(f"Missing env var: {', '.join(missing)}")
        raise ValueError(f"Missing required environment variables: {', '.join(missing)}")

def get_embedding(texts: List[str], max_retries: int = 3) -> List[List[float]]:
    """Fetches embeddings from HuggingFace with exponential backoff on 503s.
    
    Args:
        texts: A list of text strings to embed.
        max_retries: The maximum number of retry attempts.
        
    Returns:
        List of embedding vectors.
    """
    token = os.getenv("HF_TOKEN")
    if not token:
        logger.error("HF_TOKEN environment variable is not set.")
        return []
        
    headers = {"Authorization": f"Bearer {token}"}
    url = "https://router.huggingface.co/hf-inference/models/BAAI/bge-small-en-v1.5"
    payload = {"inputs": texts}
    
    for attempt in range(1, max_retries + 1):
        try:
            response = requests.post(url, headers=headers, json=payload)
            if response.status_code == 200:
                embeds = response.json()
                if isinstance(embeds, list) and len(embeds) > 0:
                    if isinstance(embeds[0], list):
                        return embeds
                    elif isinstance(embeds[0], float):
                        return [embeds]
                return []
            elif response.status_code in (503, 429):
                wait = 3 * (2 ** (attempt - 1))  # 3s, 6s, 12s
                logger.warning(f"HF API {response.status_code}, retrying attempt {attempt}/{max_retries} in {wait}s...")
                time.sleep(wait)
                continue
            else:
                response.raise_for_status()
        except requests.exceptions.HTTPError as e:
            if response.status_code not in (503, 429):
                logger.error(f"HTTP error occurred: {e}")
                return []
        except Exception as e:
            logger.error(f"Error fetching embeddings: {e}")
            return []
    
    return []
