from enum import Enum


class OAuthProvider(str, Enum):
    GOOGLE: str = "google"
    GITHUB: str = "github"
