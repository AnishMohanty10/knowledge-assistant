#!/bin/bash
set -e
echo "Starting Knowledge Assistant API..."
exec gunicorn api:app -c gunicorn_config.py
