import os
import chromadb
from typing import List, Dict, Any
from ingestion import get_embeddings_batch

def get_relevant_chunks(query: str, n_results: int = 4) -> List[Dict[str, Any]]:
    """Queries ChromaDB collection using the query and returns relevant chunks."""
    try:
        embeddings = get_embeddings_batch([query])
        if not embeddings:
            return []
        embedding = embeddings[0]

        client = chromadb.PersistentClient(path="./chroma_db")
        collection = client.get_or_create_collection(name="knowledge_base")
        
        results = collection.query(
            query_embeddings=[embedding],
            n_results=n_results
        )
        
        relevant_chunks = []
        if results['documents'] and results['documents'][0]:
            documents = results['documents'][0]
            metadatas = results['metadatas'][0] if results['metadatas'] else [{}] * len(documents)
            distances = results['distances'][0] if results['distances'] else [0.0] * len(documents)
            
            for doc, meta, dist in zip(documents, metadatas, distances):
                relevant_chunks.append({
                    "text": doc,
                    "source": meta.get("source", "Unknown"),
                    "score": dist
                })
        
        # Sort by relevance (lower distance = higher relevance)
        relevant_chunks.sort(key=lambda x: x["score"])
        return relevant_chunks

    except Exception as e:
        print(f"Error retrieving chunks: {e}")
        return []
