"use client";

import { useState } from "react";
import { FileCode, AlertCircle, AlertTriangle, Lightbulb, ChevronDown, ChevronUp } from "lucide-react";
import { Issue, SeverityFilter } from "@/types";

interface IssuesPanelProps {
  issues: Issue[];
}

const severityConfig = {
  bug: {
    label: "Bug",
    icon: AlertCircle,
    textColor: "text-red-600",
    leftBorder: "border-l-red-400",
    bgColor: "bg-red-50",
    filterActive: "bg-red-100 text-red-700 border-red-300",
  },
  warning: {
    label: "Warning",
    icon: AlertTriangle,
    textColor: "text-amber-600",
    leftBorder: "border-l-amber-400",
    bgColor: "bg-amber-50",
    filterActive: "bg-amber-100 text-amber-700 border-amber-300",
  },
  suggestion: {
    label: "Suggestion",
    icon: Lightbulb,
    textColor: "text-green-600",
    leftBorder: "border-l-green-400",
    bgColor: "bg-green-50",
    filterActive: "bg-green-100 text-green-700 border-green-300",
  },
};

function IssueCard({ issue, index }: { issue: Issue; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const config = severityConfig[issue.severity];
  const Icon = config.icon;

  return (
    <div
      className={`border-l-4 ${config.leftBorder} ${config.bgColor} rounded-r-xl p-4 issue-card cursor-pointer transition-all hover:brightness-95`}
      style={{ animationDelay: `${index * 0.05}s` }}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 mt-0.5 ${config.textColor}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <span className={`text-xs font-bold uppercase tracking-wide ${config.textColor}`}>
              {config.label}
            </span>
            <div className="flex items-center gap-1 text-gray-400 text-xs">
              <FileCode className="w-3 h-3" />
              <code className="text-gray-500 font-mono text-xs truncate max-w-[200px]">
                {issue.file}
              </code>
              {issue.line > 0 && <span className="text-gray-400">:{issue.line}</span>}
            </div>
            <span className="ml-auto text-xs text-gray-400 flex-shrink-0">
              {issue.confidence}% confidence
            </span>
          </div>

          <p className={`text-sm text-gray-700 leading-relaxed ${!expanded ? "line-clamp-2" : ""}`}>
            {issue.description}
          </p>

          {issue.description.length > 120 && (
            <button
              className="mt-1.5 text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(!expanded);
              }}
            >
              {expanded ? (
                <>
                  <ChevronUp className="w-3 h-3" /> Show less
                </>
              ) : (
                <>
                  <ChevronDown className="w-3 h-3" /> Show more
                </>
              )}
            </button>
          )}
        </div>

        {/* Confidence bar */}
        <div className="flex-shrink-0 flex flex-col items-end gap-1">
          <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
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
    </div>
  );
}

export default function IssuesPanel({ issues }: IssuesPanelProps) {
  const [filter, setFilter] = useState<SeverityFilter>("all");

  const bugs = issues.filter((i) => i.severity === "bug");
  const warnings = issues.filter((i) => i.severity === "warning");
  const suggestions = issues.filter((i) => i.severity === "suggestion");
  const filteredIssues = filter === "all" ? issues : issues.filter((i) => i.severity === filter);

  const filterButtons: { key: SeverityFilter; label: string; count: number }[] = [
    { key: "all", label: "All", count: issues.length },
    { key: "bug", label: "Bugs", count: bugs.length },
    { key: "warning", label: "Warnings", count: warnings.length },
    { key: "suggestion", label: "Suggestions", count: suggestions.length },
  ];

  if (issues.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center animate-fade-in shadow-sm">
        <div className="text-4xl mb-3">🎉</div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No issues found!</h3>
        <p className="text-gray-500 text-sm">
          No bugs, warnings, or suggestions found in this PR. Excellent work!
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 animate-fade-in shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-base font-semibold text-gray-900">
          Issues
          <span className="ml-1.5 text-sm text-gray-400 font-normal">({issues.length})</span>
        </h3>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap mb-5">
        {filterButtons.map((btn) => (
          <button
            key={btn.key}
            onClick={() => setFilter(btn.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              filter === btn.key
                ? btn.key === "bug"
                  ? "bg-red-100 text-red-700 border-red-300"
                  : btn.key === "warning"
                  ? "bg-amber-100 text-amber-700 border-amber-300"
                  : btn.key === "suggestion"
                  ? "bg-green-100 text-green-700 border-green-300"
                  : "bg-purple-100 text-purple-700 border-purple-300"
                : "bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-700"
            }`}
          >
            {btn.label}
            {btn.count > 0 && (
              <span
                className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs ${
                  filter === btn.key ? "bg-white/60" : "bg-gray-200 text-gray-500"
                }`}
              >
                {btn.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex flex-col gap-3">
        {filteredIssues.length === 0 ? (
          <div className="text-center py-6 text-gray-400 text-sm">
            No {filter === "all" ? "" : filter + "s"} found.
          </div>
        ) : (
          filteredIssues.map((issue, index) => (
            <IssueCard key={`${issue.file}-${issue.line}-${index}`} issue={issue} index={index} />
          ))
        )}
      </div>
    </div>
  );
}
