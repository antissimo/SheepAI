#!/bin/bash
set -e


echo "🚀 Starting backend + Postgres + MinIO environment"
echo




if [ ! -f "./initdb/sheep_databse_dump.sql" ]; then
   echo "❌ ERROR: initdb/sheep_databse_dump.sql not found!"
   echo "Place your SQL dump in: ./initdb/sheep_databse_dump.sql"
   exit 1
fi


if [ ! -f "./src/app/api/main.py" ]; then
   echo "❌ ERROR: FastAPI entrypoint src/app/api/main.py not found!"
   exit 1
fi


echo "🧹 Cleaning old Postgres volume..."
echo "   Stopping existing Docker Compose stack (if running)..."
if ! docker compose down --remove-orphans; then
   echo "⚠️  docker compose down failed; continuing with volume cleanup."
fi


postgres_volumes="$(docker volume ls -q | grep -E '(^|_)postgres_data$' || true)"
if [ -n "$postgres_volumes" ]; then
   echo "   Removing Postgres volumes: $postgres_volumes"
   # Intentionally unquoted to allow multiple volume names.
   docker volume rm $postgres_volumes
else
   echo "   No existing postgres_data volumes found."
fi


echo "🔨 Building backend + database containers..."
docker compose build


echo "📦 Launching Docker Compose stack..."
docker compose up -d


echo "✅ Services are starting:"
echo "   Frontend UI: http://localhost:3000"
echo "   FastAPI: http://localhost:8000/docs"
echo "   Postgres:   localhost:5432 (postgres/postgres)"
echo "   MinIO Console: http://localhost:9001  (minioadmin/minioadmin)"
echo "   MinIO S3 API:  http://localhost:9000"
docker compose logs -f backend
