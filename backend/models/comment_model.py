import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID

from database.db import Base


class Comment(Base):
    __tablename__ = "comments"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid7,
    )

    # CASCADE on both so a deleted snippet or account takes its comments with it.
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    snippet_id = Column(
        UUID(as_uuid=True),
        ForeignKey("snippets.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    body = Column(Text, nullable=False)

    author = relationship("User", back_populates="comments")
    snippet = relationship("Snippet", back_populates="comments")

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )