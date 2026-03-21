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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
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
