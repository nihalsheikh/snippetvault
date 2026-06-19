from pydantic import BaseModel


# Message Response
class MessageResponse(BaseModel):
    message: str
