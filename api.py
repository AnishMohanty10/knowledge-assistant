import os
import sys
import logging
import mimetypes
from contextlib import asynccontextmanager
from typing import List
from fastapi import FastAPI, File, UploadFile, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from ingestion import process_upload_folder
from retriever import get_relevant_chunks, EmptyKnowledgeBaseError
from llm import ask_llm
from utils import load_env
import chromadb

logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO").upper())
logger = logging.getLogger(__name__)

UPLOAD_DIR = "./data/uploads/"
ALLOWED_EXTENSIONS = {".pdf", ".txt", ".md"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown lifecycle handler."""
    try:
        load_env()
    except ValueError as e:
        logger.critical(str(e))
        sys.exit(1)
        
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    global chroma_client
    chroma_client = chromadb.PersistentClient(path="./chroma_db")
    logger.info("ChromaDB initialized and app ready.")
    yield
    logger.info("Shutting down cleanly.")

app = FastAPI(title="AI Knowledge Assistant API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catches unhandled server exceptions masking tracebacks from clients."""
    logger.error("Unhandled exception", exc_info=True)
    return JSONResponse(
        status_code=500, 
        content={"error": "internal_error", "message": "Something went wrong. Please try again."}
    )

class Message(BaseModel):
    role: str
    content: str

class QueryRequest(BaseModel):
    query: str
    history: List[Message] = []

@app.get("/api/health")
def health():
    return {"status": "ok"}

@app.post("/api/query")
def query_knowledge_base(request: QueryRequest):
    """Embeds input and fetches RAG pipeline response."""
    try:
        chunks = get_relevant_chunks(request.query, n_results=4)
        history_dicts = [{"role": m.role, "content": m.content} for m in request.history]
        result = ask_llm(request.query, chunks, history_dicts)
        return {
            "answer": result["answer"], 
            "sources": result["sources"], 
            "grounded": result.get("grounded", True)
        }
    except EmptyKnowledgeBaseError:
        return JSONResponse(
            status_code=400, 
            content={"error": "no_documents", "message": "No documents ingested yet."}
        )

@app.post("/api/ingest")
async def upload_and_ingest(files: List[UploadFile] = File(...)):
    """Receives and stages documents into local ChromaDB memory."""
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")
        
    for file in files:
        ext = os.path.splitext(file.filename)[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            return JSONResponse(
                status_code=400,
                content={"error": "invalid_file_type", "message": "Only PDF, TXT, and MD files are accepted"}
            )
            
        file_content = await file.read()
        if len(file_content) > MAX_FILE_SIZE:
            return JSONResponse(
                status_code=413,
                content={"error": "file_too_large", "message": "File exceeds 10MB limit"}
            )
            
        mime_type, _ = mimetypes.guess_type(file.filename)
        valid_mimes = ['application/pdf', 'text/plain', 'text/markdown']
        if mime_type not in valid_mimes and not file.filename.endswith('.md'):
            # mimetypes doesn't always recognize md on all systems out of the box
            return JSONResponse(
                status_code=400,
                content={"error": "invalid_file_type", "message": "Only PDF, TXT, and MD files are accepted"}
            )
            
        file_path = os.path.join(UPLOAD_DIR, file.filename)
        with open(file_path, "wb") as f:
            f.write(file_content)
    
    num_ingested, status = process_upload_folder(UPLOAD_DIR)
    if num_ingested > 0:
        return {"status": "ok", "chunks_added": num_ingested, "message": status}
    return {"status": "error", "chunks_added": 0, "message": status}

@app.delete("/api/uploads")
def delete_uploads(reset_db: bool = False):
    """Deletes all local file blobs and optionally wipes the Vector DB."""
    import shutil
    try:
        if os.path.exists(UPLOAD_DIR):
            for filename in os.listdir(UPLOAD_DIR):
                file_path = os.path.join(UPLOAD_DIR, filename)
                if os.path.isfile(file_path):
                    os.unlink(file_path)
                elif os.path.isdir(file_path):
                    shutil.rmtree(file_path)
                    
        if reset_db:
            try:
                chroma_client.delete_collection("knowledge_base")
                if os.path.exists("./chroma_db/ingested_files.json"):
                    os.unlink("./chroma_db/ingested_files.json")
            except ValueError:
                pass
                
        return {"status": "ok", "message": "Uploads cleared successfully"}
    except Exception as e:
        logger.error(f"Failed handling delete uploads: {e}")
        return JSONResponse(status_code=500, content={"error": "internal_error", "message": str(e)})

@app.get("/api/status")
def get_status():
    """Returns database size info."""
    try:
        collection = chroma_client.get_or_create_collection(name="knowledge_base")
        return {"total_chunks": collection.count(), "ready": True}
    except Exception as e:
        return {"total_chunks": 0, "ready": False, "error": str(e)}

from fastapi.responses import FileResponse

if os.path.exists("static"):
    if os.path.exists("static/assets"):
        app.mount("/assets", StaticFiles(directory="static/assets"), name="assets")
        
    @app.get("/")
    def serve_frontend():
        return FileResponse("static/index.html")
        
    @app.get("/{file_path:path}")
    def serve_static(file_path: str):
        if file_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="Not Found")
        file = os.path.join("static", file_path)
        if os.path.exists(file) and os.path.isfile(file):
            return FileResponse(file)
        return FileResponse("static/index.html")
else:
    logger.warning("static folder not found. Running purely as API mode.")
