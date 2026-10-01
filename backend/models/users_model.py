from sqlalchemy import Column, String, Boolean, Text, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime, timezone
import uuid

from database.db import Base


# Users Table
class User(Base):
    __tablename__ = "users"

    id = Column(
        UUID(as_uuid=True), primary_key=True, nullable=False, default=uuid.uuid7
    )

    name = Column(String, nullable=True)

    email = Column(String, unique=True, nullable=False, index=True)
    email_verified = Column(Boolean, nullable=False, default=False)
    email_verified_at = Column(DateTime(timezone=True), nullable=True)

    password_hash = Column(String, nullable=True)

    profile_image = Column(String)

    username = Column(String, unique=True, index=True, nullable=True)
    bio = Column(Text, nullable=True)
    website = Column(String, nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    oauth_accounts = relationship(
        "OAuthAccount", back_populates="user", cascade="all, delete-orphan"
    )

    snippets = relationship(
        "Snippet", back_populates="author", cascade="all, delete-orphan"
    )

    refresh_tokens = relationship(
        "RefreshToken", back_populates="user", cascade="all, delete-orphan"
    )

    email_verification_tokens = relationship(
        "EmailVerificationToken", back_populates="user", cascade="all, delete-orphan"
    )
