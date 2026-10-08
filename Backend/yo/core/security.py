import base64
import hashlib
import hmac
import secrets
import json
import time
import uuid
from hmac import new as hmac_new

from yo.core.config import settings


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 600_000)
    return f"pbkdf2_sha256$600000${base64.b64encode(salt).decode()}${base64.b64encode(digest).decode()}"


def verify_password(password: str, password_hash: str) -> bool:
    try:
        algorithm, iterations, encoded_salt, encoded_digest = password_hash.split("$", 3)
        if algorithm != "pbkdf2_sha256":
            return False
        salt = base64.b64decode(encoded_salt)
        expected = base64.b64decode(encoded_digest)
        actual = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, int(iterations))
        return hmac.compare_digest(actual, expected)
    except (ValueError, TypeError):
        return False


def encode_session(user_id: str) -> str:
    payload = json.dumps({"sub": user_id, "exp": int(time.time()) + settings.SESSION_MAX_AGE}, separators=(",", ":")).encode()
    encoded = base64.urlsafe_b64encode(payload).decode().rstrip("=")
    signature = hmac_new(settings.SESSION_SECRET.encode(), encoded.encode(), "sha256").hexdigest()
    return f"{encoded}.{signature}"


def decode_session(token: str | None) -> str | None:
    if not token or "." not in token:
        return None
    encoded, signature = token.split(".", 1)
    expected = hmac_new(settings.SESSION_SECRET.encode(), encoded.encode(), "sha256").hexdigest()
    if not hmac.compare_digest(signature, expected):
        return None
    try:
        payload = json.loads(base64.urlsafe_b64decode(encoded + "=" * (-len(encoded) % 4)))
        user_id = payload["sub"]
        if payload["exp"] < int(time.time()):
            return None
        uuid.UUID(user_id)
        return user_id
    except (ValueError, KeyError, TypeError, json.JSONDecodeError):
        return None