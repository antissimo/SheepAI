import os

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.db import DATABASE_URL, engine


def _cors_origins() -> list[str]:
    raw = os.getenv("CORS_ALLOW_ORIGINS", "http://localhost:3000")
    return [origin.strip() for origin in raw.split(",") if origin.strip()]


app = FastAPI(title="SheepAI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, object]:
    if not DATABASE_URL:
        return {"status": "ok", "database": "not configured"}

    try:
        assert engine is not None
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
    except SQLAlchemyError as exc:
        raise HTTPException(
            status_code=503,
            detail={"status": "degraded", "database": "down", "error": str(exc)},
        ) from exc

    return {"status": "ok", "database": "up"}


@app.get("/")
def root() -> dict[str, str]:
    return {"message": "SheepAI API"}
