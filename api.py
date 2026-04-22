from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import os
import shutil
import chromadb
from ingestion import load_documents, chunk_documents, ingest_to_chromadb
from retriever import get_relevant_chunks
from llm import ask_llm

app = FastAPI(title="AI Knowledge Assistant API")

# Allow CORS for local dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "./data/uploads/"
os.makedirs(UPLOAD_DIR, exist_ok=True)

class Message(BaseModel):
    role: str
    content: str
    sources: Optional[List[str]] = None

class QueryRequest(BaseModel):
    query: str
    history: List[Message] = []

@app.post("/api/query")
def query_knowledge_base(request: QueryRequest):
    chunks = get_relevant_chunks(request.query, n_results=4)
    # Convert Pydantic models back to dicts for the existing ask_llm function
    history_dicts = [{"role": m.role, "content": m.content} for m in request.history]
    
    result = ask_llm(request.query, chunks, history_dicts)
    return {"answer": result["answer"], "sources": result["sources"]}

@app.post("/api/ingest")
def upload_and_ingest(files: List[UploadFile] = File(...)):
    saved_files = []
    for file in files:
        file_path = os.path.join(UPLOAD_DIR, file.filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        saved_files.append(file_path)
    
    docs = load_documents(UPLOAD_DIR)
    chunks = chunk_documents(docs)
    num_ingested, status = ingest_to_chromadb(chunks)
    
    if num_ingested > 0:
        return {"status": "ok", "chunks_added": num_ingested, "message": status}
    else:
        return {"status": "error", "chunks_added": 0, "message": status}

@app.get("/api/status")
def get_status():
    try:
        client = chromadb.PersistentClient(path="./chroma_db")
        collection = client.get_or_create_collection(name="knowledge_base")
        count = collection.count()
        return {"total_chunks": count, "ready": True}
    except Exception as e:
        return {"total_chunks": 0, "ready": False, "error": str(e)}
