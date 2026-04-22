import streamlit as st
import os
import shutil
from ingestion import load_documents, chunk_documents, ingest_to_chromadb
from retriever import get_relevant_chunks
from llm import ask_llm
import chromadb

st.set_page_config(page_title="AI Knowledge Assistant", layout="wide")

# Ensure upload directory exists
UPLOAD_DIR = "./data/uploads/"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Application state
if "chat_history" not in st.session_state:
    st.session_state.chat_history = []

st.title("AI-Powered Personal Knowledge Assistant")

tab1, tab2 = st.tabs(["Upload & Ingest", "Ask a Question"])

with tab1:
    st.header("Upload Documents")
    uploaded_files = st.file_uploader("Upload PDF, TXT, or MD files", type=["pdf", "txt", "md"], accept_multiple_files=True)
    
    if st.button("Ingest documents", type="primary"):
        if not uploaded_files:
            st.warning("Please upload files first.")
        else:
            progress_bar = st.progress(0)
            status_text = st.empty()
            
            try:
                # Prevent state staleness by wiping existing uploads
                for filename in os.listdir(UPLOAD_DIR):
                    file_path = os.path.join(UPLOAD_DIR, filename)
                    try:
                        if os.path.isfile(file_path) or os.path.islink(file_path):
                            os.unlink(file_path)
                        elif os.path.isdir(file_path):
                            shutil.rmtree(file_path)
                    except Exception as e:
                        print(f"Failed to delete {file_path}. Reason: {e}")
                
                # Save uploaded files
                status_text.text("Saving uploaded files...")
                for file in uploaded_files:
                    file_path = os.path.join(UPLOAD_DIR, file.name)
                    with open(file_path, "wb") as f:
                        f.write(file.getbuffer())
                progress_bar.progress(20)
                
                # Load docs
                status_text.text("Loading documents...")
                docs = load_documents(UPLOAD_DIR)
                progress_bar.progress(50)
                
                # Chunk docs
                status_text.text("Chunking documents...")
                chunks = chunk_documents(docs)
                progress_bar.progress(70)
                
                # Ingest docs
                status_text.text("Ingesting to ChromaDB (this may take a while)...")
                num_ingested, status = ingest_to_chromadb(chunks)
                progress_bar.progress(100)
                
                if num_ingested > 0:
                    st.success(f"Ingestion complete! Stored {num_ingested} chunks. Status: {status}")
                else:
                    st.error(f"Ingestion failed or no chunks produced: {status}")
                    
            except Exception as e:
                st.error(f"An unexpected error occurred during ingestion: {e}")
                
    st.divider()
    
    # Display total chunks
    try:
        client = chromadb.PersistentClient(path="./chroma_db")
        collection = client.get_or_create_collection(name="knowledge_base")
        count = collection.count()
        st.info(f"📊 Total chunks currently stored in database: {count}")
    except Exception:
        st.info("📊 Total chunks currently stored in database: 0")


with tab2:
    st.header("Ask a Question")
    
    # Optional clear conversation
    if st.button("Clear conversation"):
        st.session_state.chat_history = []
        st.rerun()
        
    # Render chat history
    for msg in st.session_state.chat_history:
        with st.chat_message(msg["role"]):
            st.markdown(msg["content"])
            if "sources" in msg and msg["sources"]:
                with st.expander("View sources"):
                    for src in msg["sources"]:
                        st.markdown(f"- {src}")

    # Query input
    query = st.chat_input("Ask a question about your documents...")
    if query:
        # Display user question
        st.session_state.chat_history.append({"role": "user", "content": query})
        with st.chat_message("user"):
            st.markdown(query)
            
        with st.spinner("Searching for context and generating answer..."):
            with st.chat_message("assistant"):
                # Retrieve chunks
                chunks = get_relevant_chunks(query, n_results=4)
                
                if not chunks:
                    st.warning("No relevant context found in database.")
                
                # Generate answer using chat history up to before user's current query
                chat_hist_for_prompt = st.session_state.chat_history[:-1]
                
                result = ask_llm(query, chunks, chat_hist_for_prompt)
                answer = result["answer"]
                sources = result["sources"]
                
                st.markdown(answer)
                if sources:
                    with st.expander("View sources"):
                        for src in sources:
                            st.markdown(f"- {src}")
                            
                st.session_state.chat_history.append({
                    "role": "assistant",
                    "content": answer,
                    "sources": sources
                })