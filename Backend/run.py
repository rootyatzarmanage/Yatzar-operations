import uvicorn
from ycpa.core.config import settings

if __name__ == "__main__":
    print(f"Starting {settings.PROJECT_NAME} server at http://{settings.HOST}:{settings.PORT}")
    print(f"Interactive Swagger documentation at http://{settings.HOST}:{settings.PORT}/docs")
    uvicorn.run(
        "ycpa.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )
