from fastapi_users_db_sqlalchemy import SQLAlchemyUserDatabase
from fastapi_users import schemas
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.orm import DeclarativeBase
from datetime import datetime
import uuid


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "user"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(320), unique=True, index=True, nullable=False)
    username = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(1024), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    is_superuser = Column(Boolean, default=False, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class UserCreate(schemas.BaseUserCreate):
    username: str


class UserUpdate(schemas.BaseUserUpdate):
    username: str | None = None


class UserResponse(schemas.BaseUser):
    username: str
    created_at: datetime
