from sqlalchemy import (
    Column,
    String,
    Text,
    DateTime,
    Enum,
    ForeignKey,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid

from database.db import Base
from utils.oauth_enums import OAuthProvider


# OAuth Account Model
class OAuthAccount(Base):
    __tablename__ = "oauth_accounts"

    id = Column(
        UUID(as_uuid=True), primary_key=True, nullable=False, default=uuid.uuid7
    )

    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    provider = Column(Enum(OAuthProvider, name="oauth_provider"), nullable=False)

    provider_account_id = Column(String, nullable=False)

    access_token = Column(Text, nullable=True)

    refresh_token = Column(Text, nullable=True)

    token_expires_at = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User", back_populates="oauth_accounts")

    __table_args__ = (
        UniqueConstraint(
            "provider", "provider_account_id", name="uq_oauth_provider_account"
        ),
    )
