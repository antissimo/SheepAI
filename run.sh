#!/bin/bash
set -e

echo "Starting SheepAI stack"
echo

docker compose up --build -d

echo "Services:"
echo "  Frontend: http://localhost:3000"
echo "  Backend health: http://localhost:8000/health"
echo "  Backend docs: http://localhost:8000/docs"
echo "  Postgres: localhost:5432 (postgres/postgres)"

docker compose logs -f backend
