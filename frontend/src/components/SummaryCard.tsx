"use client";

import { User, GitMerge, FileCode, ChevronRight } from "lucide-react";
import { AnalysisResult } from "@/types";

interface SummaryCardProps {
  result: AnalysisResult;
}

const languageColors: Record<string, string> = {
  Python: "text-blue-700 bg-blue-50 border-blue-200",
  JavaScript: "text-amber-700 bg-amber-50 border-amber-200",
  TypeScript: "text-sky-700 bg-sky-50 border-sky-200",
  Go: "text-cyan-700 bg-cyan-50 border-cyan-200",
  Rust: "text-orange-700 bg-orange-50 border-orange-200",
  Java: "text-red-700 bg-red-50 border-red-200",
  Ruby: "text-rose-700 bg-rose-50 border-rose-200",
  PHP: "text-purple-700 bg-purple-50 border-purple-200",
  "C#": "text-green-700 bg-green-50 border-green-200",
  "C++": "text-blue-700 bg-blue-50 border-blue-200",
  Swift: "text-orange-600 bg-orange-50 border-orange-200",
  Kotlin: "text-violet-700 bg-violet-50 border-violet-200",
  Default: "text-gray-600 bg-gray-50 border-gray-200",
};

export default function SummaryCard({ result }: SummaryCardProps) {
  const langColor = languageColors[result.language] || languageColors.Default;

  const bugs = result.issues.filter((i) => i.severity === "bug").length;
  const warnings = result.issues.filter((i) => i.severity === "warning").length;
  const suggestions = result.issues.filter((i) => i.severity === "suggestion").length;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 animate-fade-in shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1 min-w-0">
          <a
            href={result.pr_url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-1.5 text-gray-900 hover:text-purple-600 transition-colors"
          >
            <h2 className="text-lg font-bold truncate">{result.pr_title}</h2>
            <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
          </a>
          <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
            <span className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              {result.pr_author}
            </span>
            <span className="text-gray-300">·</span>
            <span>{result.repo_name}</span>
            <span className="text-gray-300">·</span>
            <span>#{result.pr_number}</span>
          </div>
        </div>
        <span className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-semibold border ${langColor}`}>
          {result.language}
        </span>
      </div>

      {/* Branch info */}
      <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm">
        <GitMerge className="w-4 h-4 text-gray-400" />
        <code className="text-purple-600 font-mono text-xs">{result.pr_base_branch}</code>
        <span className="text-gray-400">←</span>
        <code className="text-blue-600 font-mono text-xs">{result.pr_head_branch}</code>
        <span className="ml-auto flex items-center gap-1 text-gray-400 text-xs">
          <FileCode className="w-3.5 h-3.5" />
          {result.total_changed_lines} lines changed
        </span>
      </div>

      {/* Summary */}
      <p className="text-gray-600 text-sm leading-relaxed mb-4">{result.summary}</p>

      {/* Stats */}
      <div className="flex items-center gap-3 flex-wrap">
        {bugs > 0 && (
          <div className="px-2.5 py-1.5 bg-red-50 border border-red-200 rounded-lg">
            <span className="text-red-700 text-xs font-semibold">
              {bugs} bug{bugs !== 1 ? "s" : ""}
            </span>
          </div>
        )}
        {warnings > 0 && (
          <div className="px-2.5 py-1.5 bg-amber-50 border border-amber-200 rounded-lg">
            <span className="text-amber-700 text-xs font-semibold">
              {warnings} warning{warnings !== 1 ? "s" : ""}
            </span>
          </div>
        )}
        {suggestions > 0 && (
          <div className="px-2.5 py-1.5 bg-green-50 border border-green-200 rounded-lg">
            <span className="text-green-700 text-xs font-semibold">
              {suggestions} suggestion{suggestions !== 1 ? "s" : ""}
            </span>
          </div>
        )}
        {result.issues.length === 0 && (
          <div className="px-2.5 py-1.5 bg-green-50 border border-green-200 rounded-lg">
            <span className="text-green-700 text-xs font-semibold">No issues found!</span>
          </div>
        )}
      </div>
    </div>
  );
}
