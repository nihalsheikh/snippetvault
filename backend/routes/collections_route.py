from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from uuid import UUID

from middleware.rate_limit import limiter
from models import Collection, CollectionSnippet, Snippet
from schemas.collection_req_res import (
    CreateCollectionRequest,
    CreateCollectionResponse,
    AllCollectionsResponse,
    CollectionResponse,
    CollectionSnippetsResponse,
    UpdateCollectionRequest,
    DeleteCollectionResponse,
    AddSnippetToCollectionRequest,
)
from utils.get_db import get_db
from auth.token import get_current_user_id

router = APIRouter(prefix="/api", tags=["Collections"])


# Create a Snippet Collection
@limiter.limit("10/minute")
@router.post(
    "/collections",
    status_code=status.HTTP_201_CREATED,
    response_model=CreateCollectionResponse,
    summary="Create a collection",
    description="Create a new snippet collection for the authenticated user.",
)
def create_collection(
    request: Request,
    collection_data: CreateCollectionRequest,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    collection = Collection(
        name=collection_data.name,
        description=collection_data.description,
        user_id=user_id,
    )

    db.add(collection)
    db.commit()
    db.refresh(collection)

    return {
        "message": "Collection created successfully",
        "collection": collection,
    }


# Get all collections for the current user
@router.get(
    "/collections",
    status_code=status.HTTP_200_OK,
    response_model=AllCollectionsResponse,
    summary="Get user's collections",
    description="Retrieve all collections created by the authenticated user.",
)
def get_user_collections(
    request: Request,
    page: int = 1,
    limit: int = 10,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    offset = (page - 1) * limit

    total = db.query(Collection).filter(Collection.user_id == user_id).count()

    collections = (
        db.query(Collection)
        .filter(Collection.user_id == user_id)
        .order_by(Collection.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    return {
        "message": "Fetched all user collections",
        "collections": collections,
        "page": page,
        "limit": limit,
        "total": total,
        "has_next": offset + len(collections) < total,
    }


# Get a single collection
@router.get(
    "/collections/{collection_id}",
    status_code=status.HTTP_200_OK,
    response_model=CollectionResponse,
    summary="Get a collection",
    description="Retrieve a single collection created by the authenticated user.",
)
def get_user_collection(
    request: Request,
    collection_id: UUID,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    collection = (
        db.query(Collection)
        .filter(
            Collection.id == collection_id,
            Collection.user_id == user_id,
        )
        .first()
    )

    if not collection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Collection not found",
        )

    return {
        "message": "Fetched collection details",
        "collection": collection,
    }


# Get the snippets inside a collection
@router.get(
    "/collections/{collection_id}/snippets",
    status_code=status.HTTP_200_OK,
    response_model=CollectionSnippetsResponse,
    summary="Get a collection's snippets",
    description="Retrieve the snippets saved in a collection owned by the authenticated user.",
)
def get_collection_snippets(
    request: Request,
    collection_id: UUID,
    page: int = 1,
    limit: int = 10,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    offset = (page - 1) * limit

    collection = (
        db.query(Collection)
        .filter(
            Collection.id == collection_id,
            Collection.user_id == user_id,
        )
        .first()
    )

    if not collection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Collection not found",
        )

    query = (
        db.query(Snippet)
        .join(
            CollectionSnippet,
            CollectionSnippet.snippet_id == Snippet.id,
        )
        .filter(CollectionSnippet.collection_id == collection_id)
    )

    total = query.count()

    snippets = (
        query.order_by(Snippet.created_at.desc()).offset(offset).limit(limit).all()
    )

    return {
        "message": "Fetched collection snippets",
        "snippets": snippets,
        "page": page,
        "limit": limit,
        "total": total,
        "has_next": offset + len(snippets) < total,
    }


# Update a collection
@limiter.limit("30/minute")
@router.patch(
    "/collections/{collection_id}",
    status_code=status.HTTP_200_OK,
    response_model=CollectionResponse,
    summary="Update a collection",
    description="Update a collection created by the authenticated user.",
)
def update_collection(
    request: Request,
    collection_id: UUID,
    collection_data: UpdateCollectionRequest,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    collection = (
        db.query(Collection)
        .filter(
            Collection.id == collection_id,
            Collection.user_id == user_id,
        )
        .first()
    )

    if not collection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Collection not found",
        )

    if collection_data.name is not None:
        collection.name = collection_data.name

    if collection_data.description is not None:
        collection.description = collection_data.description

    db.commit()
    db.refresh(collection)

    return {
        "message": "Collection updated successfully",
        "collection": collection,
    }


# Delete a collection
@limiter.limit("20/minute")
@router.delete(
    "/collections/{collection_id}",
    status_code=status.HTTP_200_OK,
    response_model=DeleteCollectionResponse,
    summary="Delete a collection",
    description="Delete a collection created by the authenticated user.",
)
def delete_collection(
    request: Request,
    collection_id: UUID,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    collection = (
        db.query(Collection)
        .filter(
            Collection.id == collection_id,
            Collection.user_id == user_id,
        )
        .first()
    )

    if not collection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Collection not found",
        )

    db.delete(collection)
    db.commit()

    return {
        "message": "Collection deleted successfully",
    }


# Add a snippet to a collection
@limiter.limit("30/minute")
@router.post(
    "/collections/{collection_id}/snippets",
    status_code=status.HTTP_201_CREATED,
    response_model=CollectionResponse,
    summary="Add snippet to collection",
    description="Add a snippet to a collection owned by the authenticated user.",
)
def add_snippet_to_collection(
    request: Request,
    collection_id: UUID,
    snippet_data: AddSnippetToCollectionRequest,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    collection = (
        db.query(Collection)
        .filter(
            Collection.id == collection_id,
            Collection.user_id == user_id,
        )
        .first()
    )

    if not collection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Collection not found",
        )

    snippet = db.query(Snippet).filter(Snippet.id == snippet_data.snippet_id).first()

    if not snippet:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Snippet not found",
        )

    existing = (
        db.query(CollectionSnippet)
        .filter(
            CollectionSnippet.collection_id == collection_id,
            CollectionSnippet.snippet_id == snippet_data.snippet_id,
        )
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Snippet already exists in this collection",
        )

    collection_snippet = CollectionSnippet(
        collection_id=collection_id,
        snippet_id=snippet_data.snippet_id,
    )

    db.add(collection_snippet)
    db.commit()

    return {
        "message": "Snippet added to collection successfully",
        "collection": collection,
    }


# Remove a snippet from a collection
@router.delete(
    "/collections/{collection_id}/snippets/{snippet_id}",
    status_code=status.HTTP_200_OK,
    response_model=CollectionResponse,
    summary="Remove snippet from collection",
    description="Remove a snippet from a collection owned by the authenticated user.",
)
def remove_snippet_from_collection(
    request: Request,
    collection_id: UUID,
    snippet_id: UUID,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    collection = (
        db.query(Collection)
        .filter(
            Collection.id == collection_id,
            Collection.user_id == user_id,
        )
        .first()
    )

    if not collection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Collection not found",
        )

    collection_snippet = (
        db.query(CollectionSnippet)
        .filter(
            CollectionSnippet.collection_id == collection_id,
            CollectionSnippet.snippet_id == snippet_id,
        )
        .first()
    )

    if not collection_snippet:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Snippet not found in this collection",
        )

    db.delete(collection_snippet)
    db.commit()

    return {
        "message": "Snippet removed from collection successfully",
        "collection": collection,
    }
