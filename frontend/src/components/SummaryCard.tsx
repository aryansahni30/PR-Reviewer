"use client";

import { User, GitMerge, FileCode, ChevronRight } from "lucide-react";
import { AnalysisResult } from "@/types";

interface SummaryCardProps {
  result: AnalysisResult;
}

const languageColors: Record<string, string> = {
  Python: "text-blue-300 bg-blue-900/30 border-blue-700/50",
  JavaScript: "text-amber-300 bg-amber-900/30 border-amber-700/50",
  TypeScript: "text-sky-300 bg-sky-900/30 border-sky-700/50",
  Go: "text-cyan-300 bg-cyan-900/30 border-cyan-700/50",
  Rust: "text-orange-300 bg-orange-900/30 border-orange-700/50",
  Java: "text-red-300 bg-red-900/30 border-red-700/50",
  Ruby: "text-rose-300 bg-rose-900/30 border-rose-700/50",
  PHP: "text-purple-300 bg-purple-900/30 border-purple-700/50",
  "C#": "text-green-300 bg-green-900/30 border-green-700/50",
  "C++": "text-blue-300 bg-blue-900/30 border-blue-700/50",
  Swift: "text-orange-300 bg-orange-900/30 border-orange-700/50",
  Kotlin: "text-violet-300 bg-violet-900/30 border-violet-700/50",
  Default: "text-gray-400 bg-midnight-base border-midnight-border",
};

export default function SummaryCard({ result }: SummaryCardProps) {
  const langColor = languageColors[result.language] || languageColors.Default;

  const bugs = result.issues.filter((i) => i.severity === "bug").length;
  const warnings = result.issues.filter((i) => i.severity === "warning").length;
  const suggestions = result.issues.filter((i) => i.severity === "suggestion").length;

  return (
    <div className="h-full p-2 sm:p-4 animate-fade-in flex flex-col justify-center">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex-1 min-w-0">
          <a
            href={result.pr_url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-2 text-white hover:text-amber-400 transition-colors"
          >
            <h2 className="text-xl sm:text-2xl font-bold truncate tracking-tight">{result.pr_title}</h2>
            <ChevronRight className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 text-amber-400" />
          </a>
          <div className="flex items-center gap-3 mt-2 text-sm text-gray-400">
            <span className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              {result.pr_author}
            </span>
            <span className="text-gray-600">·</span>
            <span className="text-gray-400">{result.repo_name}</span>
            <span className="text-gray-600">·</span>
            <span className="text-gray-400">#{result.pr_number}</span>
          </div>
        </div>
        <span className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border bg-white/5 ${langColor}`}>
          {result.language}
        </span>
      </div>

      {/* Branch info */}
      <div className="flex items-center gap-3 mb-6 px-4 py-3 bg-white/5 border border-white/5 rounded-xl text-sm">
        <GitMerge className="w-4 h-4 text-gray-500" />
        <code className="text-amber-400 font-mono text-xs bg-amber-400/10 px-1.5 py-0.5 rounded">{result.pr_base_branch}</code>
        <span className="text-gray-500">←</span>
        <code className="text-teal-400 font-mono text-xs bg-teal-400/10 px-1.5 py-0.5 rounded">{result.pr_head_branch}</code>
        <span className="ml-auto flex items-center gap-1.5 text-gray-400 text-xs font-medium">
          <FileCode className="w-4 h-4" />
          {result.total_changed_lines} lines changed
        </span>
      </div>

      {/* Summary */}
      <p className="text-gray-300 text-base leading-relaxed mb-6">{result.summary}</p>

      {/* Stats */}
      <div className="flex items-center gap-3 flex-wrap mt-auto">
        {bugs > 0 && (
          <div className="px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-lg">
            <span className="text-red-400 text-xs font-bold uppercase tracking-wide">
              {bugs} bug{bugs !== 1 ? "s" : ""}
            </span>
          </div>
        )}
        {warnings > 0 && (
          <div className="px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <span className="text-amber-400 text-xs font-bold uppercase tracking-wide">
              {warnings} warning{warnings !== 1 ? "s" : ""}
            </span>
          </div>
        )}
        {suggestions > 0 && (
          <div className="px-3 py-1.5 bg-teal-500/10 border border-teal-500/20 rounded-lg">
            <span className="text-teal-400 text-xs font-bold uppercase tracking-wide">
              {suggestions} suggestion{suggestions !== 1 ? "s" : ""}
            </span>
          </div>
        )}
        {result.issues.length === 0 && (
          <div className="px-3 py-1.5 bg-teal-500/10 border border-teal-500/20 rounded-lg">
            <span className="text-teal-400 text-xs font-bold uppercase tracking-wide">No issues found!</span>
          </div>
        )}
      </div>
    </div>
  );
}
