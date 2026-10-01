from sqlalchemy import Column, String, Integer, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime, timezone
import uuid

from database.db import Base


# Snippet Table
class Snippet(Base):
    __tablename__ = "snippets"

    id = Column(
        UUID(as_uuid=True), primary_key=True, nullable=False, default=uuid.uuid7
    )

    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    code = Column(Text, nullable=False)

    language = Column(String, nullable=False)

    is_public = Column(Boolean, nullable=False, default=True)

    copy_count = Column(Integer, nullable=False, default=0)

    ai_explanation = Column(Text, nullable=True)

    author_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    author = relationship("User", back_populates="snippets")

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

    tags = relationship(
        "Tag",
        secondary="snippet_tags",
        back_populates="snippets",
    )
