"use client";

import { useState, useMemo, useCallback } from "react";
import {
  FileCode,
  AlertCircle,
  AlertTriangle,
  Lightbulb,
  ExternalLink,
  Check,
  Loader2,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Code2,
} from "lucide-react";
import { Issue, SeverityFilter } from "@/types";
import { postInlineComment } from "@/lib/api";

interface InlineDiffReviewProps {
  rawDiff: string;
  issues: Issue[];
  prUrl: string;
  headSha: string;
}

type PostStatus = "idle" | "posting" | "posted" | "error";

// ─── Severity config ──────────────────────────────

const severityConfig = {
  bug: {
    icon: AlertCircle,
    label: "Bug",
    textColor: "text-red-400",
    accentBorder: "border-l-red-500",
    bgColor: "bg-red-500/5",
    badgeStyle: "bg-red-500/15 text-red-300 border-red-500/30",
    filterActive: "bg-red-500/20 text-red-300 border-red-500/30",
  },
  warning: {
    icon: AlertTriangle,
    label: "Warning",
    textColor: "text-amber-400",
    accentBorder: "border-l-amber-500",
    bgColor: "bg-amber-500/5",
    badgeStyle: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    filterActive: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  },
  suggestion: {
    icon: Lightbulb,
    label: "Suggestion",
    textColor: "text-teal-400",
    accentBorder: "border-l-teal-500",
    bgColor: "bg-teal-500/5",
    badgeStyle: "bg-teal-500/15 text-teal-300 border-teal-500/30",
    filterActive: "bg-teal-500/20 text-teal-300 border-teal-500/30",
  },
};

// ─── Extract code snippet from raw diff ───────────

function extractSnippet(
  rawDiff: string,
  filename: string,
  targetLine: number,
  radius: number = 2
): { lines: { num: number; code: string; type: "added" | "removed" | "context"; isTarget: boolean }[] } | null {
  const diffLines = rawDiff.split("\n");
  let inFile = false;
  let newLine = 0;

  const allFileLines: { num: number; code: string; type: "added" | "removed" | "context" }[] = [];

  for (const line of diffLines) {
    if (line.startsWith("diff --git")) {
      const match = line.match(/b\/(.+)$/);
      inFile = match ? match[1] === filename : false;
      continue;
    }
    if (!inFile) continue;
    if (line.startsWith("---") || line.startsWith("+++")) continue;
    if (line.startsWith("index ") || line.startsWith("new file") || line.startsWith("deleted file")) continue;

    if (line.startsWith("@@ ")) {
      const match = line.match(/@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      if (match) newLine = parseInt(match[1]);
      continue;
    }

    if (line.startsWith("+")) {
      allFileLines.push({ num: newLine, code: line.substring(1), type: "added" });
      newLine++;
    } else if (line.startsWith("-")) {
      allFileLines.push({ num: 0, code: line.substring(1), type: "removed" });
    } else if (line.startsWith(" ")) {
      allFileLines.push({ num: newLine, code: line.substring(1), type: "context" });
      newLine++;
    }
  }

  const targetIdx = allFileLines.findIndex((l) => l.num === targetLine && l.type !== "removed");
  if (targetIdx === -1) {
    let closestIdx = -1;
    let closestDist = Infinity;
    allFileLines.forEach((l, idx) => {
      if (l.type !== "removed" && Math.abs(l.num - targetLine) < closestDist) {
        closestDist = Math.abs(l.num - targetLine);
        closestIdx = idx;
      }
    });
    if (closestIdx === -1) return null;
    const start = Math.max(0, closestIdx - radius);
    const end = Math.min(allFileLines.length, closestIdx + radius + 1);
    return {
      lines: allFileLines.slice(start, end).map((l) => ({ ...l, isTarget: l.num === targetLine })),
    };
  }

  const start = Math.max(0, targetIdx - radius);
  const end = Math.min(allFileLines.length, targetIdx + radius + 1);
  return {
    lines: allFileLines.slice(start, end).map((l) => ({ ...l, isTarget: l.num === targetLine && l.type !== "removed" })),
  };
}

// ─── Issue card ───────────────────────────────────

function IssueCard({
  issue,
  snippet,
  prUrl,
  headSha,
  index,
}: {
  issue: Issue;
  snippet: ReturnType<typeof extractSnippet>;
  prUrl: string;
  headSha: string;
  index: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const [postStatus, setPostStatus] = useState<PostStatus>("idle");
  const [commentUrl, setCommentUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const config = severityConfig[issue.severity];
  const Icon = config.icon;

  const handlePost = useCallback(async () => {
    setPostStatus("posting");
    setErrorMsg(null);
    try {
      const data = await postInlineComment(
        prUrl,
        issue.file,
        issue.line,
        `**${config.label}** (${issue.confidence}% confidence)\n\n${issue.description}`,
        headSha
      );
      setPostStatus("posted");
      setCommentUrl(data.comment_url);
    } catch (err) {
      setPostStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Failed to post");
    }
  }, [prUrl, headSha, issue, config.label]);

  return (
    <div
      className={`border-l-4 ${config.accentBorder} ${config.bgColor} rounded-r-xl overflow-hidden issue-card transition-all`}
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      {/* Main row: icon + description + confidence */}
      <div className="flex items-start gap-3 p-4">
        <div className={`flex-shrink-0 mt-0.5 ${config.textColor}`}>
          <Icon className="w-4 h-4" />
        </div>

        <div className="flex-1 min-w-0">
          {/* Top: severity + file + line */}
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <span className={`text-xs font-bold uppercase tracking-wide ${config.textColor}`}>
              {config.label}
            </span>
            <div className="flex items-center gap-1 text-gray-500 text-xs">
              <FileCode className="w-3 h-3" />
              <code className="text-gray-500 font-mono text-xs truncate max-w-[200px]">
                {issue.file}
              </code>
              {issue.line > 0 && <span className="text-gray-500">:{issue.line}</span>}
            </div>
            <span className="ml-auto text-xs text-gray-500 flex-shrink-0">
              {issue.confidence}% confidence
            </span>
          </div>

          {/* Description — always visible, full text */}
          <p className="text-sm text-gray-300 leading-relaxed">
            {issue.description}
          </p>
        </div>

        {/* Confidence bar */}
        <div className="flex-shrink-0 flex flex-col items-end gap-1 mt-3">
          <div className="w-16 h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                issue.confidence >= 80
                  ? "bg-green-500"
                  : issue.confidence >= 60
                  ? "bg-amber-500"
                  : "bg-red-500"
              }`}
              style={{ width: `${issue.confidence}%` }}
            />
          </div>
        </div>
      </div>

      {/* Show code toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={`w-full flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold transition-all border-t border-white/5 ${
          expanded
            ? "text-gray-400 hover:text-gray-300 bg-white/[0.02]"
            : "text-blue-400 hover:text-blue-300 bg-blue-500/5 hover:bg-blue-500/10"
        }`}
      >
        <Code2 className="w-3.5 h-3.5" />
        {expanded ? "Hide code" : "Show code"}
        {expanded ? (
          <ChevronUp className="w-3 h-3" />
        ) : (
          <ChevronDown className="w-3 h-3" />
        )}
      </button>

      {/* Expanded section: full description + code snippet + post button */}
      {expanded && (
        <div className="border-t border-white/5">
          {/* Code snippet */}
          {snippet && snippet.lines.length > 0 && (
            <div className="mx-4 mb-3 rounded-xl overflow-hidden border border-white/5 bg-black/30">
              {snippet.lines.map((line, idx) => (
                <div
                  key={idx}
                  className={`flex text-[12px] font-mono leading-[1.7] ${
                    line.isTarget
                      ? "bg-amber-500/10 border-l-2 border-l-amber-400"
                      : line.type === "added"
                      ? "bg-green-500/5"
                      : line.type === "removed"
                      ? "bg-red-500/5"
                      : ""
                  }`}
                >
                  <span className="w-10 px-2 text-right text-gray-600 select-none flex-shrink-0 border-r border-white/5">
                    {line.type !== "removed" ? line.num : ""}
                  </span>
                  <span
                    className={`w-5 text-center select-none flex-shrink-0 ${
                      line.type === "added"
                        ? "text-green-500"
                        : line.type === "removed"
                        ? "text-red-500"
                        : "text-transparent"
                    }`}
                  >
                    {line.type === "added" ? "+" : line.type === "removed" ? "-" : " "}
                  </span>
                  <code
                    className={`flex-1 px-2 whitespace-pre overflow-x-auto ${
                      line.isTarget
                        ? "text-amber-200"
                        : line.type === "added"
                        ? "text-green-300/80"
                        : line.type === "removed"
                        ? "text-red-300/50 line-through"
                        : "text-gray-500"
                    }`}
                  >
                    {line.code}
                  </code>
                </div>
              ))}
            </div>
          )}

          {/* Error message */}
          {errorMsg && (
            <p className="text-xs text-red-400 px-4 mb-2">{errorMsg}</p>
          )}

          {/* Post to GitHub button */}
          <div className="flex items-center justify-end gap-2 px-4 pb-3">
            {postStatus === "idle" && (
              <button
                onClick={handlePost}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 hover:border-white/20 hover:text-white transition-all active:scale-[0.97]"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Post to GitHub
              </button>
            )}
            {postStatus === "posting" && (
              <div className="flex items-center gap-1.5 px-4 py-2 text-xs text-gray-400">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Posting…
              </div>
            )}
            {postStatus === "posted" && (
              <a
                href={commentUrl || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-teal-500/10 border border-teal-500/30 text-teal-300 hover:bg-teal-500/20 transition-all"
              >
                <Check className="w-3.5 h-3.5" />
                Posted
                <ExternalLink className="w-3 h-3 opacity-60" />
              </a>
            )}
            {postStatus === "error" && (
              <button
                onClick={handlePost}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-red-500/10 border border-red-500/30 text-red-300 hover:bg-red-500/20 transition-all"
              >
                Retry
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────

export default function InlineDiffReview({
  rawDiff,
  issues,
  prUrl,
  headSha,
}: InlineDiffReviewProps) {
  const [filter, setFilter] = useState<SeverityFilter>("all");

  // Pre-compute snippets
  const issuesWithSnippets = useMemo(() => {
    return issues.map((issue) => ({
      issue,
      snippet: extractSnippet(rawDiff, issue.file, issue.line, 2),
    }));
  }, [rawDiff, issues]);

  const bugs = issues.filter((i) => i.severity === "bug");
  const warnings = issues.filter((i) => i.severity === "warning");
  const suggestions = issues.filter((i) => i.severity === "suggestion");

  const filtered = filter === "all" ? issuesWithSnippets : issuesWithSnippets.filter((i) => i.issue.severity === filter);

  const filterButtons: { key: SeverityFilter; label: string; count: number }[] = [
    { key: "all", label: "All", count: issues.length },
    { key: "bug", label: "Bugs", count: bugs.length },
    { key: "warning", label: "Warnings", count: warnings.length },
    { key: "suggestion", label: "Suggestions", count: suggestions.length },
  ];

  if (issues.length === 0) {
    return (
      <div className="w-full p-8 text-center animate-fade-in">
        <div className="text-4xl mb-3">🎉</div>
        <h3 className="text-lg font-semibold text-gray-100 mb-2">No issues found!</h3>
        <p className="text-gray-400 text-sm">
          No bugs, warnings, or suggestions found in this PR. Excellent work!
        </p>
      </div>
    );
  }

  return (
    <div className="w-full animate-fade-in p-2 sm:p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 px-1">
        <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
          Issues
          <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-xs text-gray-300 font-medium">
            ({issues.length})
          </span>
        </h3>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap mb-5">
        {filterButtons.map((btn) => (
          <button
            key={btn.key}
            onClick={() => setFilter(btn.key)}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all shadow-sm ${
              filter === btn.key
                ? btn.key === "bug"
                  ? "bg-red-500/20 text-red-300 border-red-500/30"
                  : btn.key === "warning"
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                  : btn.key === "suggestion"
                  ? "bg-teal-500/20 text-teal-300 border-teal-500/30"
                  : "bg-white/10 text-white border-white/20"
                : "bg-black/20 text-gray-400 border-white/5 hover:border-white/10 hover:text-gray-200 hover:bg-black/40"
            }`}
          >
            {btn.label}
            {btn.count > 0 && (
              <span
                className={`ml-2 px-1.5 py-0.5 rounded text-[10px] ${
                  filter === btn.key ? "bg-black/40 text-current" : "bg-white/5 text-gray-400"
                }`}
              >
                {btn.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Issue cards */}
      <div className="flex flex-col gap-3">
        {filtered.length === 0 ? (
          <div className="text-center py-6 text-gray-500 text-sm">
            No {filter === "all" ? "" : filter + "s"} found.
          </div>
        ) : (
          filtered.map(({ issue, snippet }, idx) => (
            <IssueCard
              key={`${issue.file}-${issue.line}-${idx}`}
              issue={issue}
              snippet={snippet}
              prUrl={prUrl}
              headSha={headSha}
              index={idx}
            />
          ))
        )}
      </div>

      <p className="mt-5 text-[11px] text-gray-600 text-center">
        Expand any issue to view the code and post it as an inline review comment on GitHub.
      </p>
    </div>
  );
}
