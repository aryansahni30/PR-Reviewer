"use client";

import { User, GitMerge, FileCode, ChevronRight } from "lucide-react";
import { AnalysisResult } from "@/types";

interface SummaryCardProps {
  result: AnalysisResult;
}

const languageColors: Record<string, string> = {
  Python: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  JavaScript: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  TypeScript: "text-blue-300 bg-blue-300/10 border-blue-300/20",
  Go: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20",
  Rust: "text-orange-400 bg-orange-400/10 border-orange-400/20",
  Java: "text-red-400 bg-red-400/10 border-red-400/20",
  Ruby: "text-red-300 bg-red-300/10 border-red-300/20",
  PHP: "text-purple-400 bg-purple-400/10 border-purple-400/20",
  "C#": "text-green-400 bg-green-400/10 border-green-400/20",
  "C++": "text-blue-500 bg-blue-500/10 border-blue-500/20",
  Swift: "text-orange-300 bg-orange-300/10 border-orange-300/20",
  Kotlin: "text-purple-300 bg-purple-300/10 border-purple-300/20",
  Default: "text-gray-400 bg-gray-400/10 border-gray-400/20",
};

export default function SummaryCard({ result }: SummaryCardProps) {
  const langColor = languageColors[result.language] || languageColors.Default;

  const bugs = result.issues.filter((i) => i.severity === "bug").length;
  const warnings = result.issues.filter((i) => i.severity === "warning").length;
  const suggestions = result.issues.filter((i) => i.severity === "suggestion").length;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1 min-w-0">
          <a
            href={result.pr_url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-1.5 text-white hover:text-blue-400 transition-colors"
          >
            <h2 className="text-lg font-bold truncate">{result.pr_title}</h2>
            <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
          </a>
          <div className="flex items-center gap-3 mt-2 text-sm text-gray-400">
            <span className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              {result.pr_author}
            </span>
            <span className="text-gray-600">·</span>
            <span className="text-gray-500">{result.repo_name}</span>
            <span className="text-gray-600">·</span>
            <span className="text-gray-500">#{result.pr_number}</span>
          </div>
        </div>
        <span
          className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-semibold border ${langColor}`}
        >
          {result.language}
        </span>
      </div>

      {/* Branch info */}
      <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-gray-800/50 rounded-lg text-sm">
        <GitMerge className="w-4 h-4 text-gray-500" />
        <code className="text-purple-400 font-mono text-xs">{result.pr_base_branch}</code>
        <span className="text-gray-600">←</span>
        <code className="text-blue-400 font-mono text-xs">{result.pr_head_branch}</code>
        <span className="ml-auto flex items-center gap-1 text-gray-500 text-xs">
          <FileCode className="w-3.5 h-3.5" />
          {result.total_changed_lines} lines changed
        </span>
      </div>

      {/* Summary text */}
      <p className="text-gray-300 text-sm leading-relaxed mb-4">{result.summary}</p>

      {/* Stats row */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Issue counts */}
        {bugs > 0 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-red-500/10 border border-red-500/20 rounded-lg">
            <span className="text-red-400 text-xs font-semibold">{bugs} bug{bugs !== 1 ? "s" : ""}</span>
          </div>
        )}
        {warnings > 0 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <span className="text-yellow-400 text-xs font-semibold">{warnings} warning{warnings !== 1 ? "s" : ""}</span>
          </div>
        )}
        {suggestions > 0 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-green-500/10 border border-green-500/20 rounded-lg">
            <span className="text-green-400 text-xs font-semibold">{suggestions} suggestion{suggestions !== 1 ? "s" : ""}</span>
          </div>
        )}
        {result.issues.length === 0 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-green-500/10 border border-green-500/20 rounded-lg">
            <span className="text-green-400 text-xs font-semibold">No issues found!</span>
          </div>
        )}
      </div>
    </div>
  );
}
