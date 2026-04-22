import os
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI

load_dotenv()

def generate_answer(query, docs):
    llm = ChatOpenAI()

    context = "\n".join([doc.page_content for doc in docs])

    prompt = f"""
    Answer the question using the context below.

    Context:
    {context}

    Question:
    {query}
    """

    return llm.predict(prompt)