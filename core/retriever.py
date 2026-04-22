from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import HuggingFaceEmbeddings

def get_retriever():
    embeddings = HuggingFaceEmbeddings()

    db = Chroma(
        persist_directory="chroma_db",
        embedding_function=embeddings
    )

    return db.as_retriever()