import requests

url = "http://localhost:8000/api/ingest"
files = [("files", ("test.txt", "This is a test document."))]
try:
    response = requests.post(url, files=files)
    print(response.json())
except Exception as e:
    print(e)
