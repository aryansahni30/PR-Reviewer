export interface Issue {
  severity: "bug" | "warning" | "suggestion";
  file: string;
  line: number;
  description: string;
  confidence: number;
}

export interface AnalysisResult {
  summary: string;
  health_score: number;
  language: string;
  issues: Issue[];
  pr_title: string;
  pr_author: string;
  pr_base_branch: string;
  pr_head_branch: string;
  pr_description: string;
  total_changed_lines: number;
  pr_url: string;
  pr_number: number;
  repo_name: string;
  model_used: string;
  raw_diff?: string;
  head_sha?: string;
}

export interface HistoryEntry {
  id: string;
  result: AnalysisResult;
  analyzedAt: number; // timestamp
}

export interface RateLimit {
  count: number;
  resetAt: number; // timestamp
}

export type LoadingStep =
  | "idle"
  | "connecting"
  | "fetching"
  | "loading_files"
  | "analyzing"
  | "compiling"
  | "done";

export interface ProgressStep {
  id: LoadingStep;
  label: string;
  detail?: string;       // dynamic sub-text (repo, file count, model name)
  scanningFile?: string; // file currently being cycled during AI analysis
  status: "pending" | "active" | "done";
  startedAt?: number;    // timestamp when step became active
  durationMs?: number;   // set when step completes
}

export type SeverityFilter = "all" | "bug" | "warning" | "suggestion";

