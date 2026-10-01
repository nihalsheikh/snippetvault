import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID

from database.db import Base


class CollectionSnippet(Base):
    __tablename__ = "collection_snippets"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid7,
    )

    collection_id = Column(
        UUID(as_uuid=True),
        ForeignKey("collections.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    snippet_id = Column(
        UUID(as_uuid=True),
        ForeignKey("snippets.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    __table_args__ = (
        UniqueConstraint(
            "collection_id",
            "snippet_id",
            name="uq_collection_snippet",
        ),
    )
