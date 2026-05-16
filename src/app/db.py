import os

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.models import Base


DATABASE_URL = os.getenv("DATABASE_URL", "")
engine = (
    create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        pool_size=2,
        max_overflow=0,
        future=True,
    )
    if DATABASE_URL
    else None
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine) if engine else None


def get_db_session():
    if SessionLocal is None:
        raise RuntimeError("Database is not configured")
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


def create_db_and_tables():
    if engine is None:
        return
    Base.metadata.create_all(bind=engine)

