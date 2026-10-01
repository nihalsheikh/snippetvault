from pydantic import BaseModel, ConfigDict, Field
from uuid import UUID
from datetime import datetime


# Snippet Details
class SnippetDetails(BaseModel):
    id: UUID
    title: str
    description: str | None = None
    code: str
    language: str
    is_public: bool
    copy_count: int
    ai_explanation: str | None = None
    author_id: UUID
    created_at: datetime
    updated_at: datetime
    tags: list[TagDetails] = []

    model_config = ConfigDict(from_attributes=True)


# Tag Details
class TagDetails(BaseModel):
    id: UUID
    name: str
    slug: str

    model_config = ConfigDict(from_attributes=True)


# All Public Snippet res
class AllPublicSnippetResponse(BaseModel):
    message: str
    snippets: list[SnippetDetails]


# Single Public Snippet res
class PublicSnippetResonse(BaseModel):
    message: str
    snippet: SnippetDetails


# Create Snippet req
class CreateSnippetRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    code: str = Field(..., min_length=1)
    language: str = Field(..., min_length=1, max_length=50)
    is_public: bool = True
    tags: list[str] = []


# User snippets res
class AllSnippetResponse(BaseModel):
    message: str
    snippets: list[SnippetDetails]

    model_config = ConfigDict(from_attributes=True)


# Single Snippet by user res
class UserSnippetResponse(BaseModel):
    message: str
    snippet: SnippetDetails

    model_config = ConfigDict(from_attributes=True)


# Update a snippet req
class UpdateSnippetRequest(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    code: str | None = Field(None, min_length=1)
    language: str | None = Field(None, min_length=1, max_length=50)
    is_public: bool | None = None
    tags: list[str] | None = None


# Delete a snippet res
class DeleteSnippetResponse(BaseModel):
    message: str


# Copy a snippet res
class CopySnippetResponse(BaseModel):
    message: str
    copy_count: int


# Bookmark Snippet response
class BookmarkResponse(BaseModel):
    message: str
    bookmark_id: UUID


# Bookmaark Details
class BookmarkSnippetDetails(BaseModel):
    id: UUID
    title: str
    description: str | None = None
    code: str
    language: str
    is_public: bool
    copy_count: int
    ai_explanation: str | None = None
    author_id: UUID
    created_at: datetime
    updated_at: datetime
    tags: list[TagDetails] = []

    model_config = ConfigDict(from_attributes=True)


# Get all Bookmark res
class AllBookmarksResponse(BaseModel):
    message: str
    bookmarks: list[BookmarkSnippetDetails]

    model_config = ConfigDict(from_attributes=True)
