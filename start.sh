#!/bin/bash
set -e
exec gunicorn api:app -c gunicorn_config.py --bind 0.0.0.0:${PORT:-8000}