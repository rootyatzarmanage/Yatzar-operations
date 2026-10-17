from pathlib import Path

from fastapi import UploadFile

from yo.core.exceptions import AppException


STORAGE_DIR = Path(__file__).resolve().parents[2] / "storage"
ALLOWED_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}
MAX_FILE_SIZE = 5 * 1024 * 1024


async def read_image(file: UploadFile) -> tuple[bytes, str]:
    extension = ALLOWED_TYPES.get(file.content_type or "")
    if not extension:
        raise AppException("Only JPG, PNG, and WEBP images are allowed.", 400)
    content = await file.read(MAX_FILE_SIZE + 1)
    if not content:
        raise AppException("Image is empty.", 400)
    if len(content) > MAX_FILE_SIZE:
        raise AppException("Image size must not exceed 5 MB.", 413)
    return content, extension
