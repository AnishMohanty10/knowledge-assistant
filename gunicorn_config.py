import os

# 🔥 FORCE LOW MEMORY USAGE
workers = 1
threads = 2

worker_class = "uvicorn.workers.UvicornWorker"
bind = None

# Stability
timeout = 120
keepalive = 5

# Logging
accesslog = "-"
errorlog = "-"
loglevel = os.getenv("LOG_LEVEL", "info")