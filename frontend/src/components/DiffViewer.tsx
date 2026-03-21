"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, FileCode } from "lucide-react";
import { Issue } from "@/types";

interface DiffViewerProps {
  issues: Issue[];
}

interface ParsedFile {
  filename: string;
  issues: Issue[];
}

function parseDiffToFiles(issues: Issue[]): ParsedFile[] {
  const fileMap = new Map<string, Issue[]>();
  for (const issue of issues) {
    const existing = fileMap.get(issue.file) || [];
    existing.push(issue);
    fileMap.set(issue.file, existing);
  }
  const files: ParsedFile[] = [];
  fileMap.forEach((fileIssues, filename) => {
    files.push({ filename, issues: fileIssues });
  });
  return files;
}

const severityStyles = {
  bug: {
    leftBorder: "border-l-red-400",
    bg: "bg-red-900/20",
    badge: "bg-red-900/40 text-red-400 border-red-700/50",
    dot: "bg-red-400",
  },
  warning: {
    leftBorder: "border-l-amber-400",
    bg: "bg-amber-900/20",
    badge: "bg-amber-900/40 text-amber-400 border-amber-700/50",
    dot: "bg-amber-400",
  },
  suggestion: {
    leftBorder: "border-l-green-400",
    bg: "bg-green-900/20",
    badge: "bg-green-900/40 text-green-400 border-green-700/50",
    dot: "bg-green-400",
  },
};

function FileBlock({ file }: { file: ParsedFile }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="border border-midnight-border rounded-xl overflow-hidden shadow-sm">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-midnight-base hover:bg-midnight-border/40 transition-colors text-left border-b border-midnight-border"
      >
        <FileCode className="w-4 h-4 text-amber-primary flex-shrink-0" />
        <code className="text-sm text-gray-300 font-mono flex-1 truncate">{file.filename}</code>
        <div className="flex items-center gap-2 flex-shrink-0">
          {file.issues.filter((i) => i.severity === "bug").length > 0 && (
            <span className="px-2 py-0.5 rounded text-xs bg-red-900/40 text-red-400 border border-red-700/50">
              {file.issues.filter((i) => i.severity === "bug").length} bug
            </span>
          )}
          {file.issues.filter((i) => i.severity === "warning").length > 0 && (
            <span className="px-2 py-0.5 rounded text-xs bg-amber-900/40 text-amber-400 border border-amber-700/50">
              {file.issues.filter((i) => i.severity === "warning").length} warn
            </span>
          )}
          {file.issues.filter((i) => i.severity === "suggestion").length > 0 && (
            <span className="px-2 py-0.5 rounded text-xs bg-green-900/40 text-green-400 border border-green-700/50">
              {file.issues.filter((i) => i.severity === "suggestion").length} sugg
            </span>
          )}
          {collapsed ? (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronUp className="w-4 h-4 text-gray-500" />
          )}
        </div>
      </button>

      {!collapsed && (
        <div className="divide-y divide-midnight-border">
          {file.issues.map((issue, idx) => {
            const style = severityStyles[issue.severity];
            return (
              <div
                key={idx}
                className={`flex items-start gap-3 pl-4 pr-4 py-3 border-l-4 ${style.leftBorder} ${style.bg}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${style.badge}`}>
                      {issue.severity}
                    </span>
                    {issue.line > 0 && (
                      <span className="text-xs text-gray-500 font-mono">Line {issue.line}</span>
                    )}
                    <span className="text-xs text-gray-500 ml-auto">{issue.confidence}% confident</span>
                  </div>
                  <p className="text-sm text-gray-300 leading-relaxed">{issue.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function DiffViewer({ issues }: DiffViewerProps) {
  const files = parseDiffToFiles(issues);

  if (files.length === 0) {
    return (
      <div className="bg-midnight-card border border-midnight-border rounded-2xl p-8 text-center animate-fade-in shadow-sm">
        <div className="text-3xl mb-3">✨</div>
        <h3 className="text-base font-semibold text-gray-100 mb-2">Clean code!</h3>
        <p className="text-gray-400 text-sm">No file-specific issues detected.</p>
      </div>
    );
  }

  return (
    <div className="bg-midnight-card border border-midnight-border rounded-2xl p-6 animate-fade-in shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-base font-semibold text-gray-100">
          Annotated Files
          <span className="ml-1.5 text-sm text-gray-500 font-normal">
            ({files.length} file{files.length !== 1 ? "s" : ""} with issues)
          </span>
        </h3>
      </div>

      <div className="flex flex-col gap-3">
        {files.map((file) => (
          <FileBlock key={file.filename} file={file} />
        ))}
      </div>

      <p className="mt-4 text-xs text-gray-500 text-center">
        Files with AI-detected issues. See Issues panel for full details.
      </p>
    </div>
  );
}
