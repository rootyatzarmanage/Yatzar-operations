import base64
import hashlib

from cryptography.fernet import Fernet, InvalidToken

from yo.core.config import settings


def _fernet() -> Fernet:
    key = hashlib.sha256(f"workspace-mail:{settings.SESSION_SECRET}".encode()).digest()
    return Fernet(base64.urlsafe_b64encode(key))


def encrypt_secret(value: str) -> str:
    return _fernet().encrypt(value.encode()).decode()


def decrypt_secret(value: str | None) -> str:
    if not value:
        return ""
    try:
        return _fernet().decrypt(value.encode()).decode()
    except InvalidToken:
        return ""
