#!/bin/bash
set -e

exec gunicorn api:app \
  --workers 1 \
  --threads 2 \
  --bind 0.0.0.0:$PORT