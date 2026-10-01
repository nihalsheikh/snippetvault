import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from database.db import Base


class Tag(Base):
    __tablename__ = "tags"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid7,
    )

    name = Column(String(50), unique=True, nullable=False, index=True)

    slug = Column(String(50), unique=True, nullable=False, index=True)

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    snippets = relationship(
        "Snippet",
        secondary="snippet_tags",
        back_populates="tags",
    )
