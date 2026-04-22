"""Module to handle ChromaDB search retrieval logic."""
import chromadb
from typing import List, Dict, Any
import logging
from utils import get_embedding

logger = logging.getLogger(__name__)

class EmptyKnowledgeBaseError(Exception):
    """Exception raised when querying an empty ChromaDB collection."""
    pass

def get_relevant_chunks(query: str, n_results: int = 4) -> List[Dict[str, Any]]:
    """Embeds the query and queries ChromaDB for relevant semantic chunks.
    
    Args:
        query: The user's input string.
        n_results: Maximum number of chunks to fetch.
        
    Returns:
        A formatted list of document chunk dictionaries.
        
    Raises:
        EmptyKnowledgeBaseError: If the DB collection is empty.
    """
    try:
        client = chromadb.PersistentClient(path="./chroma_db")
        collection = client.get_or_create_collection(name="knowledge_base")
        
        if collection.count() == 0:
            raise EmptyKnowledgeBaseError("No documents ingested yet.")

        embeddings = get_embedding([query])
        if not embeddings:
            return []
        embedding = embeddings[0]

        results = collection.query(
            query_embeddings=[embedding],
            n_results=n_results
        )
        
        relevant_chunks = []
        if results.get('documents') and results['documents'][0]:
            documents = results['documents'][0]
            metadatas = results['metadatas'][0] if results.get('metadatas') else [{}] * len(documents)
            distances = results['distances'][0] if results.get('distances') else [0.0] * len(documents)
            
            for doc, meta, dist in zip(documents, metadatas, distances):
                if dist < 1.3:
                    relevant_chunks.append({
                        "text": doc,
                        "source": meta.get("source", "Unknown"),
                        "score": dist
                    })
                else:
                    logger.info(f"Chunk from {meta.get('source')} rejected due to distance: {dist:.4f}")
        
        relevant_chunks.sort(key=lambda x: x["score"])
        logger.info(f"Retrieved {len(relevant_chunks)} filtered chunks for query.")
        return relevant_chunks

    except EmptyKnowledgeBaseError:
        raise
    except Exception as e:
        logger.error(f"Error retrieving chunks: {e}")
        return []
