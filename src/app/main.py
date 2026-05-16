import os
from pathlib import Path
from uuid import uuid4

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi_users import FastAPIUsers
from fastapi_users.authentication import (
    AuthenticationBackend,
    BearerTransport,
    JWTStrategy,
)
from fastapi_users_db_sqlalchemy import SQLAlchemyUserDatabase
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from agents.classification_agent import run_classification_agent
from agents.filter_agent import run_filter_agent
from agents.post_filter_standardization_agent import run_post_filter_standardization_agent
from agents.schemas import CitizenReportInput, ClassificationAgentResult, FilterAgentResult
from app.db import DATABASE_URL, SessionLocal, create_db_and_tables, engine
from app.models import User, UserCreate, UserUpdate, UserResponse


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


# FastAPI-Users setup
async def get_user_db():
    if SessionLocal is None:
        raise HTTPException(status_code=503, detail="Database is not configured")
    session = SessionLocal()
    try:
        yield SQLAlchemyUserDatabase(session, User)
    finally:
        session.close()


SECRET = os.getenv("SECRET_KEY")
if not SECRET:
    raise ValueError("SECRET_KEY environment variable must be set")

bearer_transport = BearerTransport(tokenUrl="auth/jwt/login")


def get_jwt_strategy() -> JWTStrategy:
    return JWTStrategy(secret=SECRET, lifetime_seconds=3600)


auth_backend = AuthenticationBackend(
    name="jwt",
    transport=bearer_transport,
    get_strategy=get_jwt_strategy,
)

fastapi_users = FastAPIUsers[User, str](
    get_user_db,
    [auth_backend],
)

current_active_user = fastapi_users.current_user(active=True)

# Include auth routes
app.include_router(
    fastapi_users.get_auth_router(auth_backend),
    prefix="/auth/jwt",
    tags=["auth"],
)

app.include_router(
    fastapi_users.get_register_router(UserResponse, UserCreate),
    prefix="/auth",
    tags=["auth"],
)

app.include_router(
    fastapi_users.get_users_router(UserResponse, UserUpdate),
    prefix="/users",
    tags=["users"],
)


@app.on_event("startup")
def on_startup() -> None:
    create_db_and_tables()



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
    image_name: str | None = None
    if image is not None:
        tmp_dir = Path("/tmp/split_reports")
        tmp_dir.mkdir(parents=True, exist_ok=True)
        suffix = Path(image.filename or "").suffix
        filename = f"{uuid4().hex}{suffix}"
        target = tmp_dir / filename
        contents = await image.read()
        target.write_bytes(contents)
        image_path = str(target)
        image_name = image.filename

    report = CitizenReportInput(
        text=text,
        image_path=image_path,
        image_name=image_name,
        lat=lat,
        lng=lng,
        district_suggestion=district_suggestion,
    )
    return await run_filter_agent(report)
@app.post("/agent/pipeline", response_model=ClassificationAgentResult)
async def agent_pipeline(
    text: str | None = Form(default=None),
    lat: float | None = Form(default=None),
    lng: float | None = Form(default=None),
    district_suggestion: str | None = Form(default=None),
    image: UploadFile | None = File(default=None),
) -> ClassificationAgentResult:
    image_path: str | None = None
    image_name: str | None = None
    if image is not None:
        tmp_dir = Path("/tmp/split_reports")
        tmp_dir.mkdir(parents=True, exist_ok=True)
        suffix = Path(image.filename or "").suffix
        filename = f"{uuid4().hex}{suffix}"
        target = tmp_dir / filename
        contents = await image.read()
        target.write_bytes(contents)
        image_path = str(target)
        image_name = image.filename

    report = CitizenReportInput(
        text=text,
        image_path=image_path,
        image_name=image_name,
        lat=lat,
        lng=lng,
        district_suggestion=district_suggestion,
    )
    filter_result = await run_filter_agent(report)
    filter_reason_upper = (filter_result.reason or "").upper()
    provider_filter_error = any(
        token in filter_reason_upper
        for token in ["PERMISSION_DENIED", "403", "RUNTIME ERROR", "GEMINI/AGENT RUNTIME ERROR"]
    )
    if not filter_result.valid and not provider_filter_error:
        return ClassificationAgentResult(
            hitnost="NISKA",
            naslov="Prijava nije prošla filter",
            sluzba="KOMUNALNO_REDARSTVO",
            opis_problema=filter_result.reason,
            kotar=district_suggestion,
            lokacija=f"{lat},{lng}" if lat is not None and lng is not None else None,
            broj_duplikata=0,
            status="ODBIJENO",
            raw_model_response=filter_result.raw_model_response,
        )

    standardized = await run_post_filter_standardization_agent(
        report.text,
        report.lat,
        report.lng,
        report.district_suggestion,
        report.image_path,
        report.image_name,
    )
    classification = await run_classification_agent(
        standardized_text_en=standardized.standardized_text_en,
        lat=report.lat,
        lng=report.lng,
        district_suggestion=report.district_suggestion,
        image_path=report.image_path,
        image_name=report.image_name,
    )
    if provider_filter_error:
        note = f"Filter provider fallback: {filter_result.reason}"
        if classification.raw_model_response:
            classification.raw_model_response = f"{classification.raw_model_response}\n{note}"
        else:
            classification.raw_model_response = note
    classification.kotar = report.district_suggestion if report.district_suggestion else None
    return classification
