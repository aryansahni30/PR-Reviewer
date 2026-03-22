import asyncio
import base64
import logging
import os
import re

import httpx
from typing import Optional

logger = logging.getLogger(__name__)

# Maximum lines to keep per file when truncating large files
_MAX_LINES_PER_FILE = 300
# Context lines to keep around each changed hunk when truncating
_CONTEXT_AROUND_HUNK = 75


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


async def post_pr_review_comment(
    owner: str,
    repo: str,
    pull_number: int,
    body: str,
    path: str,
    line: int,
    commit_id: str,
    token: Optional[str] = None,
) -> dict:
    """Post an inline review comment on a specific file/line in a PR."""
    url = f"{GITHUB_API_BASE}/repos/{owner}/{repo}/pulls/{pull_number}/comments"
    headers = _get_headers(token)
    headers["Content-Type"] = "application/json"

    effective_token = token or os.getenv("GITHUB_TOKEN")
    if not effective_token:
        raise ValueError("A GitHub token is required to post review comments.")

    payload = {
        "body": body,
        "commit_id": commit_id,
        "path": path,
        "line": line,
        "side": "RIGHT",
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(url, headers=headers, json=payload)
        if response.status_code == 401:
            raise ValueError("GitHub authentication failed. Check your GITHUB_TOKEN.")
        if response.status_code == 403:
            raise ValueError("Insufficient permissions to post review comments. Ensure your token has 'repo' scope.")
        if response.status_code == 404:
            detail = response.json().get("message", "Not Found")
            logger.error(f"GitHub 404 for POST {url}: {detail}")
            raise ValueError(
                f"PR not found or token lacks access: {owner}/{repo}#{pull_number}. "
                f"Ensure your GITHUB_TOKEN has 'repo' scope and hasn't expired. GitHub says: {detail}"
            )
        if response.status_code == 422:
            error_body = response.json()
            error_detail = error_body.get("message", "Invalid request")
            errors = error_body.get("errors", [])
            error_msgs = [e.get("message", str(e)) for e in errors] if errors else []
            full_msg = f"{error_detail}: {'; '.join(error_msgs)}" if error_msgs else error_detail
            logger.error(f"GitHub 422 for POST {url}: {full_msg}")
            raise ValueError(f"GitHub rejected the comment: {full_msg}")
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
            or line.startswith(" ")
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


# ---------------------------------------------------------------------------
# Full-file context helpers
# ---------------------------------------------------------------------------

def extract_changed_files(diff: str) -> list[str]:
    """Extract the list of changed file paths from a unified diff."""
    files: list[str] = []
    for line in diff.split("\n"):
        if line.startswith("diff --git"):
            parts = line.split(" b/")
            if len(parts) > 1:
                files.append(parts[-1])
    return files


def _extract_hunk_lines(diff: str, filename: str) -> list[int]:
    """Return the starting line numbers of every hunk that touches `filename`."""
    hunk_lines: list[int] = []
    in_file = False
    for line in diff.split("\n"):
        if line.startswith("diff --git"):
            in_file = line.endswith(f" b/{filename}")
        elif in_file and line.startswith("@@ "):
            # @@ -old_start,old_count +new_start,new_count @@
            m = re.search(r"\+(\d+)", line)
            if m:
                hunk_lines.append(int(m.group(1)))
    return hunk_lines


def _truncate_around_hunks(content: str, hunk_lines: list[int]) -> str:
    """Keep only ~_CONTEXT_AROUND_HUNK lines around each changed hunk."""
    lines = content.split("\n")
    if len(lines) <= _MAX_LINES_PER_FILE:
        return content

    keep: set[int] = set()
    for hunk_start in hunk_lines:
        low = max(0, hunk_start - _CONTEXT_AROUND_HUNK - 1)
        high = min(len(lines), hunk_start + _CONTEXT_AROUND_HUNK)
        keep.update(range(low, high))

    # Also always keep the first 30 lines (imports / module docstring)
    keep.update(range(0, min(30, len(lines))))

    sorted_indices = sorted(keep)
    result_lines: list[str] = []
    prev = -1
    for idx in sorted_indices:
        if prev != -1 and idx != prev + 1:
            result_lines.append(f"\n... [{idx - prev - 1} lines truncated] ...\n")
        result_lines.append(lines[idx])
        prev = idx

    return "\n".join(result_lines)


async def fetch_file_content(
    client: httpx.AsyncClient,
    owner: str,
    repo: str,
    path: str,
    ref: str,
    headers: dict,
) -> tuple[str, str | None]:
    """Fetch a single file's content from the GitHub Contents API.

    Returns (path, content_string) or (path, None) on failure.
    """
    url = f"{GITHUB_API_BASE}/repos/{owner}/{repo}/contents/{path}"
    try:
        response = await client.get(url, headers=headers, params={"ref": ref})
        if response.status_code != 200:
            logger.warning("Could not fetch %s (HTTP %d)", path, response.status_code)
            return path, None

        data = response.json()

        # GitHub returns base64-encoded content for files
        if data.get("encoding") == "base64" and data.get("content"):
            decoded = base64.b64decode(data["content"]).decode("utf-8", errors="replace")
            return path, decoded

        # If the file is too large, GitHub returns a download_url instead
        if data.get("download_url"):
            dl_resp = await client.get(data["download_url"], timeout=15.0)
            if dl_resp.status_code == 200:
                return path, dl_resp.text

        return path, None
    except Exception as e:
        logger.warning("Error fetching file %s: %s", path, e)
        return path, None


async def fetch_pr_file_contexts(
    owner: str,
    repo: str,
    diff: str,
    head_sha: str,
    token: Optional[str] = None,
    max_total_chars: int = 25_000,
) -> dict[str, str]:
    """Fetch full file contents for all files changed in a PR.

    Returns a dict mapping filename -> content (truncated if necessary).
    Respects a total character budget to keep the AI prompt manageable.
    """
    changed_files = extract_changed_files(diff)
    if not changed_files:
        return {}

    headers = _get_headers(token)

    async with httpx.AsyncClient(timeout=30.0) as client:
        tasks = [
            fetch_file_content(client, owner, repo, path, head_sha, headers)
            for path in changed_files
        ]
        results = await asyncio.gather(*tasks)

    # Collect successful results and apply per-file truncation
    file_contexts: dict[str, str] = {}
    total_chars = 0

    for path, content in results:
        if content is None:
            continue

        # Apply smart truncation for large files
        hunk_lines = _extract_hunk_lines(diff, path)
        truncated = _truncate_around_hunks(content, hunk_lines)

        # Check total budget
        if total_chars + len(truncated) > max_total_chars:
            remaining = max_total_chars - total_chars
            if remaining > 500:  # Only include if we have meaningful space
                truncated = truncated[:remaining] + "\n\n[file truncated — budget exceeded]"
                file_contexts[path] = truncated
                total_chars += len(truncated)
            break

        file_contexts[path] = truncated
        total_chars += len(truncated)

    logger.info(
        "Fetched %d/%d file contexts (%d chars total)",
        len(file_contexts), len(changed_files), total_chars,
    )
    return file_contexts

