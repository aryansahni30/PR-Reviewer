import traceback
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.github import (
    parse_pr_url,
    fetch_pr_diff,
    fetch_pr_metadata,
    filter_changed_lines,
    count_changed_lines,
    detect_language_from_diff,
)
from services.ai import analyze_pr_diff

router = APIRouter()


class AnalyzeRequest(BaseModel):
    url: str
    strict_mode: bool = False
    model: str = "qwen/qwen2.5-coder-32b-instruct"


class AnalyzeResponse(BaseModel):
    summary: str
    health_score: int
    language: str
    issues: list
    pr_title: str
    pr_author: str
    pr_base_branch: str
    pr_head_branch: str
    pr_description: str
    total_changed_lines: int
    pr_url: str
    pr_number: int
    repo_name: str


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_pr(request: AnalyzeRequest):
    """Analyze a GitHub PR using Claude AI."""
    try:
        owner, repo, pull_number = parse_pr_url(request.url)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    try:
        diff_raw, metadata = await fetch_pr_diff(owner, repo, pull_number), None
        metadata = await fetch_pr_metadata(owner, repo, pull_number)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"GitHub API error: {str(e)}")

    if not diff_raw or not diff_raw.strip():
        raise HTTPException(
            status_code=400,
            detail="This PR has no diff content. It may already be merged or have no file changes.",
        )

    filtered_diff = filter_changed_lines(diff_raw)
    total_changed_lines = count_changed_lines(diff_raw)
    language = detect_language_from_diff(diff_raw)

    pr_title = metadata.get("title", "Untitled PR")
    pr_author = metadata.get("user", {}).get("login", "unknown")
    pr_base_branch = metadata.get("base", {}).get("ref", "main")
    pr_head_branch = metadata.get("head", {}).get("ref", "feature")
    pr_description = metadata.get("body", "") or ""

    # Truncate diff if too large for model context (~30k chars max)
    MAX_DIFF_CHARS = 30_000
    if len(filtered_diff) > MAX_DIFF_CHARS:
        filtered_diff = filtered_diff[:MAX_DIFF_CHARS] + "\n\n[diff truncated — too large]"

    try:
        ai_result = await analyze_pr_diff(
            diff=filtered_diff,
            pr_title=pr_title,
            pr_description=pr_description,
            language=language,
            strict_mode=request.strict_mode,
            model=request.model,
        )
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"AI analysis error: {str(e)}")

    return AnalyzeResponse(
        summary=ai_result["summary"],
        health_score=ai_result["health_score"],
        language=ai_result.get("language", language),
        issues=ai_result["issues"],
        pr_title=pr_title,
        pr_author=pr_author,
        pr_base_branch=pr_base_branch,
        pr_head_branch=pr_head_branch,
        pr_description=pr_description,
        total_changed_lines=total_changed_lines,
        pr_url=request.url,
        pr_number=pull_number,
        repo_name=f"{owner}/{repo}",
    )
