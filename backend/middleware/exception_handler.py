from fastapi import Request, status
from fastapi.responses import JSONResponse


# Unexpected error 500
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error"},
    )


# FastAPI HTTP Errors
async def http_exception_handler(request: Request, exc: Exception):
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


# Pydantic Request Validation Error
async def validation_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=422,  # HTTP_422_UNPROCESSABLE_CONTENT is a MagicMock that won't JSON-encode
        content={"detail": "Validation Error", "errors": exc.errors()},
    )
