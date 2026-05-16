import os
from pathlib import Path
from uuid import uuid4

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from agents.filter_agent import run_filter_agent
from agents.schemas import CitizenReportInput, FilterAgentResult
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


@app.post("/agent/filter", response_model=FilterAgentResult)
async def agent_filter(
    text: str | None = Form(default=None),
    lat: float | None = Form(default=None),
    lng: float | None = Form(default=None),
    district_suggestion: str | None = Form(default=None),
    image: UploadFile | None = File(default=None),
) -> FilterAgentResult:
    image_path: str | None = None
    if image is not None:
        tmp_dir = Path("/tmp/split_reports")
        tmp_dir.mkdir(parents=True, exist_ok=True)
        suffix = Path(image.filename or "").suffix
        filename = f"{uuid4().hex}{suffix}"
        target = tmp_dir / filename
        contents = await image.read()
        target.write_bytes(contents)
        image_path = str(target)

    report = CitizenReportInput(
        text=text,
        image_path=image_path,
        lat=lat,
        lng=lng,
        district_suggestion=district_suggestion,
    )
    vrijednost = await run_filter_agent(report)

    
