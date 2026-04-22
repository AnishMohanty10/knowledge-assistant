from retriever import get_relevant_chunks
from llm import ask_llm

query = "What is a test document?"
chunks = get_relevant_chunks(query, n_results=4)
print("CHUNKS:", chunks)
ans = ask_llm(query, chunks, [])
print("LLM ANS:", ans)
