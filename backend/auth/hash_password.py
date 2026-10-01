import bcrypt

MAX_BCRYPT_BYTES = 72


# Hash Password
def hash_password(password: str) -> str:
    password_bytes = password.encode("utf-8")

    if len(password_bytes) > MAX_BCRYPT_BYTES:
        raise ValueError("Password is too long")

    return bcrypt.hashpw(password_bytes, bcrypt.gensalt()).decode("utf-8")


# Verify Hashed Password
def verify_password(password: str, hashed_password: str) -> bool:
    password_bytes = password.encode("utf-8")

    if len(password_bytes) > MAX_BCRYPT_BYTES:
        return False

    return bcrypt.checkpw(password_bytes, hashed_password.encode("utf-8"))
