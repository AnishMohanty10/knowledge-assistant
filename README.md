# AI-Powered Personal Knowledge Assistant

This project implements an end-to-end Retrieval-Augmented Generation (RAG) pipeline to ingest documents (PDF, Markdown, Text) and enable intelligent, context-aware querying using a local vector database. It leverages Hugging Face's Inference API for generating embeddings, ChromaDB for local vector storage, and OpenAI's GPT-3.5-Turbo for producing accurate, cited answers via a Streamlit user interface.

## Setup Instructions

1. Clone the repository to your local machine.
2. Create and activate a Python virtual environment:
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows, use `venv\Scripts\activate`
   ```
3. Install the required dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Create a `.env` file based on `.env.example` and fill in your actual API keys:
   ```bash
   cp .env.example .env
   # Make sure to edit .env to insert your OPENAI_API_KEY
   ```

## How to Ingest Documents

You can ingest documents either via the Streamlit UI or using the Command Line Interface (CLI):

```bash
# Ingest all files from a specific folder
python ingestion.py ./data/uploads/
```

## How to Run the App

Start the new React web application and FastAPI backend with the following commands:

```bash
# Terminal 1: Start frontend
cd knowledge-ui && npm install && npm run dev

# Terminal 2: Start backend
uvicorn api:app --reload --port 8000
```

*(Legacy Streamlit UI is still available via `streamlit run app.py`)*

## Folder Structure Diagram

```text
├── .env                  # Environment variables (do not commit)
├── .env.example          # Example environment variables template
├── app.py                # Streamlit UI
├── chroma_db/            # Local ChromaDB persistent storage (auto-generated)
├── data/
│   └── uploads/          # Directory for uploaded documents (auto-generated)
├── ingestion.py          # Document loading, chunking, and embedding logic
├── llm.py                # OpenAI interaction and prompt building
├── README.md             # Project documentation
├── requirements.txt      # Python dependencies
└── retriever.py          # ChromaDB querying logic
```