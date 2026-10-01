from pydantic import BaseModel, Field, ConfigDict
from uuid import UUID
from datetime import datetime

from schemas.snippet_req_res import SnippetDetails


# Collection details
class CollectionDetails(BaseModel):
    id: UUID
    name: str
    description: str | None = None
    user_id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# Create Collection req
class CreateCollectionRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: str | None = None


# Create collection res
class CreateCollectionResponse(BaseModel):
    message: str
    collection: CollectionDetails


# Get all collections by user res
class AllCollectionsResponse(BaseModel):
    message: str
    collections: list[CollectionDetails]
    page: int
    limit: int
    total: int
    has_next: bool

    model_config = ConfigDict(from_attributes=True)


# Get a single collection res
class CollectionResponse(BaseModel):
    message: str
    collection: CollectionDetails

    model_config = ConfigDict(from_attributes=True)


# Update a collection req
class UpdateCollectionRequest(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=100)
    description: str | None = None


# Delete a collection res
class DeleteCollectionResponse(BaseModel):
    message: str


# Add a snippet to collection req
class AddSnippetToCollectionRequest(BaseModel):
    snippet_id: UUID


# Snippets inside a collection
class CollectionSnippetsResponse(BaseModel):
    message: str
    snippets: list[SnippetDetails]
    page: int
    limit: int
    total: int
    has_next: bool

    model_config = ConfigDict(from_attributes=True)
