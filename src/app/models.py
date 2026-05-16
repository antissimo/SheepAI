from fastapi_users_db_sqlalchemy import SQLAlchemyUserDatabase
from fastapi_users import schemas
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Enum as SQLEnum
from sqlalchemy.orm import DeclarativeBase, relationship
from datetime import datetime
import uuid

from app.role import Role


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
    role = Column(SQLEnum(Role), default=Role.KORISNIK, nullable=False)
    district = Column(String(255), nullable=True)  # Samo za KOTAR
    service = Column(String(255), nullable=True)  # Samo za SLUZBA role
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    reports = relationship("Report", back_populates="submitted_by_user", foreign_keys="Report.submitted_by")


class Report(Base):
    __tablename__ = "report"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(500), nullable=True)
    description = Column(Text, nullable=True)
    location = Column(String(500), nullable=True)
    district = Column(String(255), nullable=True, index=True)  # Kotar gdje se dogodio problem
    category = Column(String(255), nullable=True)
    service = Column(String(255), nullable=True)  # Kojoj službi je namjena (Čistoća, Policija...)
    priority = Column(String(50), nullable=True)
    status = Column(String(50), default="new", nullable=False)
    summary = Column(Text, nullable=True)
    ai_summary = Column(Text, nullable=True)
    submitted_by = Column(String(36), ForeignKey("user.id"), nullable=True, index=True)
    submitted_by_user = relationship("User", back_populates="reports", foreign_keys=[submitted_by])
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class UserCreate(schemas.BaseUserCreate):
    username: str
    role: Role = Role.KORISNIK
    district: str | None = None
    service: str | None = None


class UserUpdate(schemas.BaseUserUpdate):
    username: str | None = None
    district: str | None = None
    service: str | None = None


class UserResponse(schemas.BaseUser):
    username: str
    role: Role
    district: str | None = None
    service: str | None = None
    created_at: datetime


class ReportCreate(schemas.BaseModel):
    title: str | None = None
    description: str | None = None
    location: str | None = None
    district: str | None = None
    category: str | None = None
    service: str | None = None
    priority: str | None = None
    status: str | None = None


class ReportUpdate(schemas.BaseModel):
    title: str | None = None
    description: str | None = None
    location: str | None = None
    district: str | None = None
    category: str | None = None
    service: str | None = None
    priority: str | None = None
    status: str | None = None
    summary: str | None = None
    ai_summary: str | None = None


class ReportResponse(schemas.BaseModel):
    id: int
    title: str | None
    description: str | None
    location: str | None
    district: str | None
    category: str | None
    service: str | None
    priority: str | None
    status: str
    summary: str | None
    ai_summary: str | None
    submitted_by: str | None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

