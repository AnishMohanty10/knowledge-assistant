"""Module for loading, chunking, and ingesting documents into ChromaDB."""
import os
import json
import hashlib
import logging
import argparse
from typing import List, Dict, Any, Tuple
from pypdf import PdfReader
from langchain_text_splitters import RecursiveCharacterTextSplitter
import chromadb
from utils import get_embedding

logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO").upper())
logger = logging.getLogger(__name__)

INGESTED_REGISTRY_PATH = "./chroma_db/ingested_files.json"

def load_registry() -> Dict[str, str]:
    """Loads the registry of previously ingested files.
    
    Returns:
        Dictionary mapping filenames to their SHA-256 hashes.
    """
    if os.path.exists(INGESTED_REGISTRY_PATH):
        try:
            with open(INGESTED_REGISTRY_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Failed to load registry: {e}")
    return {}

def save_registry(registry: Dict[str, str]) -> None:
    """Saves the ingested file registry.
    
    Args:
        registry: The dictionary mapping filenames to SHA-256 hashes.
    """
    os.makedirs(os.path.dirname(INGESTED_REGISTRY_PATH), exist_ok=True)
    with open(INGESTED_REGISTRY_PATH, "w", encoding="utf-8") as f:
        json.dump(registry, f, indent=4)

def compute_sha256(file_path: str) -> str:
    """Computes the SHA-256 hash of a file.
    
    Args:
        file_path: The absolute or relative path to the file.
        
    Returns:
        The SHA-256 hex string.
    """
    sha256 = hashlib.sha256()
    with open(file_path, "rb") as f:
        while chunk := f.read(8192):
            sha256.update(chunk)
    return sha256.hexdigest()

def clear_uploads(folder_path: str) -> None:
    """Safely deletes all files within the data/uploads directory.
    
    Args:
        folder_path: Path to the uploads folder.
    """
    import shutil
    if not os.path.exists(folder_path):
        return
    for filename in os.listdir(folder_path):
        file_path = os.path.join(folder_path, filename)
        try:
            if os.path.isfile(file_path) or os.path.islink(file_path):
                os.unlink(file_path)
            elif os.path.isdir(file_path):
                shutil.rmtree(file_path)
        except Exception as e:
            logger.error(f"Failed to delete {file_path}. Reason: {e}")

def load_documents(folder_path: str, registry: Dict[str, str]) -> Tuple[List[Dict[str, Any]], Dict[str, str]]:
    """Reads available files, checking against the SHA-256 registry.
    
    Args:
        folder_path: Path containing the documents.
        registry: Current file hash registry.
        
    Returns:
        A tuple of (loaded_documents, updated_registry).
    """
    documents = []
    if not os.path.exists(folder_path):
        return documents, registry
        
    for root, _, files in os.walk(folder_path):
        for file in files:
            file_path = os.path.join(root, file)
            file_hash = compute_sha256(file_path)
            
            if file in registry and registry[file] == file_hash:
                logger.info(f"Skipping {file} - already ingested and unmodified.")
                continue
            
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
                    registry[file] = file_hash
                except Exception as e:
                    logger.error(f"Error reading PDF {file}: {e}")
            elif file.lower().endswith((".txt", ".md")):
                try:
                    with open(file_path, "r", encoding="utf-8") as f:
                        text = f.read()
                        if text:
                            documents.append({
                                "text": text,
                                "metadata": {"source": file}
                            })
                    registry[file] = file_hash
                except Exception as e:
                    logger.error(f"Error reading text file {file}: {e}")
    return documents, registry

def chunk_documents(documents: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Splits documents into smaller semantic chunks.
    
    Args:
        documents: A list of dicts containing text and metadata.
        
    Returns:
        List of chunk dictionaries.
    """
    splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
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

def ingest_to_chromadb(chunks: List[Dict[str, Any]]) -> Tuple[int, str]:
    """Embeds each chunk and upserts securely into ChromaDB.
    
    Args:
        chunks: List of document chunks.
        
    Returns:
        Tuple mapping (number of chunks ingested, status message).
    """
    if not chunks:
        return 0, "No new chunks provided to ingest."
        
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
            
            batch_embeddings = get_embedding(batch_texts)
            if not batch_embeddings or len(batch_embeddings) != len(batch_texts):
                logger.warning(f"Failed to get embeddings for batch starting at {i}")
                continue
                
            for j, chunk in enumerate(batch_chunks):
                texts.append(chunk["text"])
                
                meta = chunk["metadata"]
                clean_meta = {}
                for k, v in meta.items():
                    if v is not None:
                        if isinstance(v, (str, int, float, bool)):
                            clean_meta[k] = v
                        else:
                            clean_meta[k] = str(v)
                
                metadatas.append(clean_meta)
                
                # Deterministic ID generation to prevent ghost accumulation
                source_filename = clean_meta.get("source", "unknown")
                chunk_index = clean_meta.get("chunk_index", 0)
                chunk_hash_input = f"{source_filename}_{chunk_index}_{chunk['text'][:40]}".encode('utf-8')
                deterministic_id = hashlib.md5(chunk_hash_input).hexdigest()
                
                ids.append(f"doc_{deterministic_id}")
                embeddings.append(batch_embeddings[j])
                count += 1

        if ids:
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
            return 0, "No valid chunks embedded."

    except Exception as e:
        logger.error(f"Error saving to ChromaDB: {e}")
        return 0, f"Error: {e}"

def process_upload_folder(folder_path: str) -> Tuple[int, str]:
    """Wraps ingestion tasks for an entire folder and updates the registry.
    
    Args:
        folder_path: Path containing documents.
        
    Returns:
        Tuple mapping (ingested row count, final status info).
    """
    registry = load_registry()
    docs, new_registry = load_documents(folder_path, registry)
    if not docs:
        clear_uploads(folder_path)
        return 0, "No new unseen documents found."
        
    chunks = chunk_documents(docs)
    num, status = ingest_to_chromadb(chunks)
    
    if num > 0:
        save_registry(new_registry)
        
    clear_uploads(folder_path)
    return num, status

def main():
    """CLI orchestrator for the data ingestion pipeline."""
    parser = argparse.ArgumentParser(description="Ingest documents to local vector store.")
    parser.add_argument("folder_path", type=str, help="Folder containing .pdf, .txt, .md files")
    args = parser.parse_args()
    
    logger.info(f"Loading documents from {args.folder_path}...")
    num_ingested, status = process_upload_folder(args.folder_path)
    logger.info(f"Ingestion result: {status}. Total ingested chunks: {num_ingested}.")

if __name__ == "__main__":
    main()
