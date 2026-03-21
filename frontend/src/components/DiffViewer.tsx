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
    leftBorder: "border-l-red-500",
    bg: "bg-red-500/5",
    badge: "bg-red-500/20 text-red-300 border border-red-500/30",
    dot: "bg-red-500",
  },
  warning: {
    leftBorder: "border-l-amber-500",
    bg: "bg-amber-500/5",
    badge: "bg-amber-500/20 text-amber-300 border border-amber-500/30",
    dot: "bg-amber-500",
  },
  suggestion: {
    leftBorder: "border-l-teal-500",
    bg: "bg-teal-500/5",
    badge: "bg-teal-500/20 text-teal-300 border border-teal-500/30",
    dot: "bg-teal-500",
  },
};

function FileBlock({ file }: { file: ParsedFile }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="border border-white/5 rounded-2xl overflow-hidden shadow-md bg-black/20">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-white/5 transition-colors text-left border-b border-white/5"
      >
        <FileCode className="w-4 h-4 text-amber-500 flex-shrink-0" />
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
        <div className="divide-y divide-white/5">
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
      <div className="w-full p-8 text-center animate-fade-in">
        <div className="text-4xl mb-4">✨</div>
        <h3 className="text-lg font-bold text-white mb-2">Clean code!</h3>
        <p className="text-gray-400 text-sm">No file-specific issues detected.</p>
      </div>
    );
  }

  return (
    <div className="w-full animate-fade-in p-2 sm:p-4">
      <div className="flex items-center justify-between mb-6 px-1">
        <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
          Annotated Files
          <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-xs text-gray-300 font-medium">
            {files.length} file{files.length !== 1 ? "s" : ""}
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
