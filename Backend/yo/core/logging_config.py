import logging
import json
from logging.handlers import RotatingFileHandler
from pathlib import Path


class ApplicationFormatter(logging.Formatter):
    _standard_fields = set(logging.makeLogRecord({}).__dict__) | {
        "message", "asctime",
    }

    def format(self, record: logging.LogRecord) -> str:
        line = super().format(record)
        context = {
            key: value for key, value in record.__dict__.items()
            if key not in self._standard_fields and not key.startswith("_")
        }
        if context:
            line = f"{line} {json.dumps(context, default=str, sort_keys=True)}"
        return line


def configure_logging() -> Path:
    """Write application logger output to Backend/logs/application.log."""
    backend_dir = Path(__file__).resolve().parents[2]
    log_dir = backend_dir / "logs"
    log_dir.mkdir(parents=True, exist_ok=True)

    root_logger = logging.getLogger()
    root_logger.setLevel(min(root_logger.level or logging.WARNING, logging.INFO))

    log_path = log_dir / "application.log"
    already_configured = any(
        isinstance(handler, RotatingFileHandler)
        and Path(handler.baseFilename) == log_path.resolve()
        for handler in root_logger.handlers
    )
    if not already_configured:
        file_handler = RotatingFileHandler(
            log_path,
            maxBytes=10 * 1024 * 1024,
            backupCount=5,
            encoding="utf-8",
        )
        file_handler.setLevel(logging.INFO)
        file_handler.setFormatter(ApplicationFormatter(
            "%(asctime)s %(levelname)s [%(name)s] %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        ))
        root_logger.addHandler(file_handler)

    return log_dir
