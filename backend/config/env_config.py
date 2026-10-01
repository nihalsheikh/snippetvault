from dotenv import load_dotenv
import os

load_dotenv()

if os.getenv("DATABASE_URL") is None:
    raise RuntimeError("ERROR: DATABASE_URL not set in Environment Variables")

if os.getenv("JWT_SECRET_KEY") is None:
    raise RuntimeError("SECRET_KEY not set")

if os.getenv("GOOGLE_GEMINI_API_KEY") is None:
    raise RuntimeError("AI_API_KEY not set")

if os.getenv("GOOGLE_GEMINI_MODEL") is None:
    raise RuntimeError("AI_MODEL not set")


class EnvSettings:
    db_url: str = os.getenv("DATABASE_URL")
    frontend_url: str = os.getenv("FRONTEND_URL", "http://localhost:5173")
    base_url: str = os.getenv("BACKEND_URL", "http://127.0.0.1:8000")
    jwt_secret_key: str = os.getenv("JWT_SECRET_KEY")
    jwt_algorithm: str = os.getenv("JWT_ALGORITHM", "HS256")
    access_token_expire_minutes: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES"))
    refresh_token_expire_days: int = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS"))
    google_gemini_api_key: str = os.getenv("GOOGLE_GEMINI_API_KEY")
    google_gemini_model: str = os.getenv("GOOGLE_GEMINI_MODEL")
    brevo_api_key: str = os.getenv("BREVO_API_KEY")
    brevo_sender_email: str = os.getenv("BREVO_SENDER_EMAIL")
    brevo_sender_name: str = os.getenv("BREVO_SENDER_NAME")


env_settings = EnvSettings()
