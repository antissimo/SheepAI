import os

from sqlalchemy import create_engine


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
