import os
import glob
import time
import argparse
from typing import List, Dict, Any
from pypdf import PdfReader
from langchain_text_splitters import RecursiveCharacterTextSplitter
import chromadb
import hashlib
import uuid
import requests
from dotenv import load_dotenv

load_dotenv()

HF_API_TOKEN = os.getenv("HF_TOKEN") or os.getenv("HF_API_TOKEN")
API_URL = "https://router.huggingface.co/hf-inference/models/BAAI/bge-small-en-v1.5"

def load_documents(folder_path: str) -> List[Dict[str, Any]]:
    """Recursively reads all .pdf, .txt, .md files from a folder."""
    documents = []
    if not os.path.exists(folder_path):
        return documents
        
    for root, _, files in os.walk(folder_path):
        for file in files:
            file_path = os.path.join(root, file)
            if file.lower().endswith(".pdf"):
                try:
                    reader = PdfReader(file_path)
                    for i, page in enumerate(reader.pages):
                        text = page.extract_text()
                        if text:
                            documents.append({
                                "text": text,
                                "metadata": {"source": file, "page": i + 1}
                            })
                except Exception as e:
                    print(f"Error reading PDF {file}: {e}")
            elif file.lower().endswith((".txt", ".md")):
                try:
                    with open(file_path, "r", encoding="utf-8") as f:
                        text = f.read()
                        if text:
                            documents.append({
                                "text": text,
                                "metadata": {"source": file}
                            })
                except Exception as e:
                    print(f"Error reading text file {file}: {e}")
    return documents

def chunk_documents(documents: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Chunks documents using RecursiveCharacterTextSplitter and deduplicates them."""
    splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
    chunks = []
    seen_texts = set()
    
    for doc in documents:
        text = doc["text"]
        metadata = doc["metadata"]
        split_texts = splitter.split_text(text)
        for i, split_text in enumerate(split_texts):
            if split_text not in seen_texts:
                seen_texts.add(split_text)
                chunk_meta = metadata.copy()
                chunk_meta["chunk_index"] = i
                chunks.append({
                    "text": split_text,
                    "metadata": chunk_meta
                })
    return chunks

def get_embeddings_batch(texts: List[str]) -> List[List[float]]:
    """Calls Hugging Face Inference API to get a batch of embeddings."""
    if not HF_API_TOKEN:
        print("Error: HF_TOKEN environment variable is not set.")
        return []
        
    headers = {"Authorization": f"Bearer {HF_API_TOKEN}"}
    payload = {"inputs": texts}
    
    for _ in range(5):
        try:
            response = requests.post(API_URL, headers=headers, json=payload)
            if response.status_code == 200:
                embeds = response.json()
                if isinstance(embeds, list) and len(embeds) > 0:
                    if isinstance(embeds[0], list):
                        return embeds
                    elif isinstance(embeds[0], float):
                        return [embeds]
                return []
            elif response.status_code == 503 or response.status_code == 429:
                time.sleep(3)
                continue
            else:
                response.raise_for_status()
        except requests.exceptions.HTTPError as e:
            if response.status_code not in (503, 429):
                print(f"HTTP error occurred: {e}")
                return []
        except Exception as e:
            print(f"Error fetching embeddings: {e}")
            return []
    return []

def ingest_to_chromadb(chunks: List[Dict[str, Any]]) -> tuple[int, str]:
    """Embeds each chunk and upserts into ChromaDB 'knowledge_base' collection."""
    try:
        client = chromadb.PersistentClient(path="./chroma_db")
        collection = client.get_or_create_collection(name="knowledge_base")
        
        texts = []
        metadatas = []
        ids = []
        embeddings = []
        
        count = 0
        batch_size = 32
        
        for i in range(0, len(chunks), batch_size):
            batch_chunks = chunks[i:i + batch_size]
            batch_texts = [chunk["text"] for chunk in batch_chunks]
            
            batch_embeddings = get_embeddings_batch(batch_texts)
            if not batch_embeddings or len(batch_embeddings) != len(batch_texts):
                print(f"Warning: Failed to get embeddings for batch starting at {i}")
                continue
                
            for j, chunk in enumerate(batch_chunks):
                texts.append(chunk["text"])
                
                # Ensure metadata has 'source' and 'page'/'chunk_index' without nested or weird types
                meta = chunk["metadata"]
                clean_meta = {}
                for k, v in meta.items():
                    if v is not None:
                        # ChromaDB metadata values must be str, int, float, or bool
                        if isinstance(v, (str, int, float, bool)):
                            clean_meta[k] = v
                        else:
                            clean_meta[k] = str(v)
                
                metadatas.append(clean_meta)
                
                # Generate a unique hash for the ID
                chunk_hash = hashlib.md5(chunk["text"].encode('utf-8')).hexdigest()
                ids.append(f"doc_{chunk_hash}")
                embeddings.append(batch_embeddings[j])
                count += 1

        if ids:
            # Batch upsert into ChromaDB
            MAX_UPSERT = 100
            for i in range(0, len(ids), MAX_UPSERT):
                collection.upsert(
                    ids=ids[i:i + MAX_UPSERT],
                    documents=texts[i:i + MAX_UPSERT],
                    metadatas=metadatas[i:i + MAX_UPSERT],
                    embeddings=embeddings[i:i + MAX_UPSERT]
                )
            return count, "Success"
        else:
            return 0, "No valid chunks to embed."

    except Exception as e:
        return 0, f"Error: {e}"

def main():
    """Orchestrates the full data ingestion pipeline from the command line."""
    parser = argparse.ArgumentParser(description="Ingest documents to local vector store.")
    parser.add_argument("folder_path", type=str, help="Folder containing .pdf, .txt, .md files")
    args = parser.parse_args()
    
    print(f"Loading documents from {args.folder_path}...")
    docs = load_documents(args.folder_path)
    print(f"Found {len(docs)} documents/pages.")
    
    print("Chunking documents...")
    chunks = chunk_documents(docs)
    print(f"Generated {len(chunks)} chunks.")
    
    print("Ingesting to ChromaDB...")
    num_ingested, status = ingest_to_chromadb(chunks)
    print(f"Ingestion result: {status}. Total ingested chunks: {num_ingested}.")

if __name__ == "__main__":
    main()
