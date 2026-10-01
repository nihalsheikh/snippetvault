from pydantic import BaseModel, Field, ConfigDict
from uuid import UUID
from datetime import datetime


# Comment author — nested so the frontend gets avatar data without a second call.
class CommentAuthor(BaseModel):
    id: UUID
    name: str | None = None
    username: str | None = None

    model_config = ConfigDict(from_attributes=True)


# Comment Details
class CommentDetails(BaseModel):
    id: UUID
    body: str
    user_id: UUID
    snippet_id: UUID
    created_at: datetime
    author: CommentAuthor

    model_config = ConfigDict(from_attributes=True)


# Create a comment req
class CreateCommentRequest(BaseModel):
    body: str = Field(..., min_length=1, max_length=2000)


# Create comment res
class CommentResponse(BaseModel):
    message: str
    comment: CommentDetails

    model_config = ConfigDict(from_attributes=True)


# All comments on a snippet res
class AllCommentsResponse(BaseModel):
    message: str
    comments: list[CommentDetails]
    page: int
    limit: int
    total: int
    has_next: bool

    model_config = ConfigDict(from_attributes=True)


# Delete comment res
class DeleteCommentResponse(BaseModel):
    message: str