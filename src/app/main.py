import os
from pathlib import Path
from uuid import uuid4

from fastapi import FastAPI, File, Form, HTTPException, UploadFile, Depends
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

from agents.filter_agent import run_filter_agent
from agents.schemas import CitizenReportInput, FilterAgentResult
from app.db import DATABASE_URL, engine, SessionLocal, get_db_session, create_db_and_tables
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
    fastapi_users.get_user_router(UserResponse, UserUpdate),
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


