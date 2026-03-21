import os
import httpx
from typing import Optional


GITHUB_API_BASE = "https://api.github.com"


def _get_headers(token: Optional[str] = None) -> dict:
    headers = {
        "Accept": "application/vnd.github.v3+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    effective_token = token or os.getenv("GITHUB_TOKEN")
    if effective_token:
        headers["Authorization"] = f"Bearer {effective_token}"
    return headers


def parse_pr_url(url: str) -> tuple[str, str, int]:
    """Parse a GitHub PR URL and return (owner, repo, pull_number)."""
    url = url.strip().rstrip("/")
    # Handle both https://github.com/owner/repo/pull/123 formats
    if "github.com" not in url:
        raise ValueError("URL must be a GitHub URL")

    parts = url.split("github.com/")[-1].split("/")
    if len(parts) < 4 or parts[2] != "pull":
        raise ValueError(
            "Invalid GitHub PR URL format. Expected: https://github.com/{owner}/{repo}/pull/{number}"
        )

    owner = parts[0]
    repo = parts[1]
    try:
        pull_number = int(parts[3])
    except ValueError:
        raise ValueError(f"Invalid pull request number: {parts[3]}")

    return owner, repo, pull_number


async def fetch_pr_diff(owner: str, repo: str, pull_number: int, token: Optional[str] = None) -> str:
    """Fetch the raw diff for a PR."""
    url = f"{GITHUB_API_BASE}/repos/{owner}/{repo}/pulls/{pull_number}"
    headers = _get_headers(token)
    headers["Accept"] = "application/vnd.github.v3.diff"

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(url, headers=headers)
        if response.status_code == 404:
            raise ValueError(f"PR not found: {owner}/{repo}#{pull_number}")
        if response.status_code == 401:
            raise ValueError("GitHub authentication failed. Check your GITHUB_TOKEN.")
        if response.status_code == 403:
            raise ValueError("GitHub rate limit exceeded or access denied.")
        response.raise_for_status()
        return response.text


async def fetch_pr_metadata(owner: str, repo: str, pull_number: int, token: Optional[str] = None) -> dict:
    """Fetch PR metadata (title, author, branches, etc.)."""
    url = f"{GITHUB_API_BASE}/repos/{owner}/{repo}/pulls/{pull_number}"
    headers = _get_headers(token)

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(url, headers=headers)
        if response.status_code == 404:
            raise ValueError(f"PR not found: {owner}/{repo}#{pull_number}")
        response.raise_for_status()
        return response.json()


async def post_pr_comment(
    owner: str,
    repo: str,
    pull_number: int,
    body: str,
    token: Optional[str] = None,
) -> dict:
    """Post a comment on a GitHub PR."""
    url = f"{GITHUB_API_BASE}/repos/{owner}/{repo}/issues/{pull_number}/comments"
    headers = _get_headers(token)
    headers["Content-Type"] = "application/json"

    effective_token = token or os.getenv("GITHUB_TOKEN")
    if not effective_token:
        raise ValueError("A GitHub token is required to post comments.")

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(url, headers=headers, json={"body": body})
        if response.status_code == 401:
            raise ValueError("GitHub authentication failed. Check your GITHUB_TOKEN.")
        if response.status_code == 403:
            raise ValueError("Insufficient permissions to post a comment on this PR.")
        if response.status_code == 404:
            raise ValueError(f"PR not found: {owner}/{repo}#{pull_number}")
        response.raise_for_status()
        return response.json()


def filter_changed_lines(diff: str) -> str:
    """Filter diff to only include changed lines (+ or -) and file headers."""
    lines = diff.split("\n")
    filtered = []
    for line in lines:
        # Keep file headers, hunk headers, and changed lines
        if (
            line.startswith("diff --git")
            or line.startswith("--- ")
            or line.startswith("+++ ")
            or line.startswith("@@ ")
            or line.startswith("+")
            or line.startswith("-")
        ):
            filtered.append(line)
    return "\n".join(filtered)


def count_changed_lines(diff: str) -> int:
    """Count the number of added + removed lines in a diff."""
    count = 0
    for line in diff.split("\n"):
        if (line.startswith("+") and not line.startswith("+++")) or (
            line.startswith("-") and not line.startswith("---")
        ):
            count += 1
    return count


def detect_language_from_diff(diff: str) -> str:
    """Detect the primary programming language from file extensions in the diff."""
    extension_map = {
        ".py": "Python",
        ".js": "JavaScript",
        ".ts": "TypeScript",
        ".tsx": "TypeScript",
        ".jsx": "JavaScript",
        ".go": "Go",
        ".rs": "Rust",
        ".java": "Java",
        ".kt": "Kotlin",
        ".cs": "C#",
        ".cpp": "C++",
        ".c": "C",
        ".rb": "Ruby",
        ".php": "PHP",
        ".swift": "Swift",
        ".vue": "Vue",
        ".svelte": "Svelte",
        ".html": "HTML",
        ".css": "CSS",
        ".scss": "SCSS",
        ".yaml": "YAML",
        ".yml": "YAML",
        ".json": "JSON",
        ".sh": "Shell",
        ".bash": "Shell",
        ".sql": "SQL",
        ".md": "Markdown",
        ".tf": "Terraform",
    }

    counts: dict[str, int] = {}
    for line in diff.split("\n"):
        if line.startswith("diff --git"):
            # Extract filename
            parts = line.split(" b/")
            if len(parts) > 1:
                filename = parts[-1]
                for ext, lang in extension_map.items():
                    if filename.endswith(ext):
                        counts[lang] = counts.get(lang, 0) + 1
                        break

    if not counts:
        return "Unknown"
    return max(counts, key=counts.get)  # type: ignore
