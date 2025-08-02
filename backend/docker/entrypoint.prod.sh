#!/bin/bash

echo "Starting FastAPI application..."

# Cambiar al directorio donde está main.py
cd app

# Ejecutar gunicorn desde el directorio correcto
gunicorn -c ../gunicorn.conf.py main:app