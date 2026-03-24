import { AnalysisResult } from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function getPRFiles(
  url: string
): Promise<{ files: string[]; total_changed_lines: number }> {
  const response = await fetch(
    `${API_URL}/api/pr-files?url=${encodeURIComponent(url)}`
  );
  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(err.detail || `Request failed with status ${response.status}`);
  }
  return response.json();
}

export async function analyzePR(
  url: string,
  strictMode: boolean = false,
  model: string = "claude"
): Promise<AnalysisResult> {
  const response = await fetch(`${API_URL}/api/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, strict_mode: strictMode, model }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(errorData.detail || `Request failed with status ${response.status}`);
  }

  return response.json();
}

export async function postComment(
  url: string,
  feedback: AnalysisResult,
  githubToken?: string
): Promise<{ success: boolean; comment_url: string; message: string }> {
  const response = await fetch(`${API_URL}/api/post-comment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url,
      feedback,
      github_token: githubToken || process.env.NEXT_PUBLIC_GITHUB_TOKEN || undefined,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(errorData.detail || `Request failed with status ${response.status}`);
  }

  return response.json();
}

export async function postInlineComment(
  url: string,
  file: string,
  line: number,
  body: string,
  commitId: string,
  githubToken?: string
): Promise<{ success: boolean; comment_url: string; message: string }> {
  const response = await fetch(`${API_URL}/api/post-inline-comment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url,
      file,
      line,
      body,
      commit_id: commitId,
      github_token: githubToken || process.env.NEXT_PUBLIC_GITHUB_TOKEN || undefined,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(errorData.detail || `Request failed with status ${response.status}`);
  }

  return response.json();
}
