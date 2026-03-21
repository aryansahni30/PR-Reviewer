import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from routers import analyze, comment

app = FastAPI(
    title="PR Code Reviewer API",
    description="AI-powered GitHub PR code review using Claude",
    version="1.0.0",
)

allowed_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

extra_origins = os.getenv("ALLOWED_ORIGINS", "")
if extra_origins:
    allowed_origins.extend([o.strip() for o in extra_origins.split(",")])

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analyze.router, prefix="/api")
app.include_router(comment.router, prefix="/api")


@app.get("/")
async def root():
    return {"status": "ok", "message": "PR Code Reviewer API is running"}


@app.get("/health")
async def health():
    return {"status": "healthy"}
