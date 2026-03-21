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
    bg: "bg-red-50",
    badge: "bg-red-100 text-red-700 border-red-200",
    dot: "bg-red-500",
  },
  warning: {
    leftBorder: "border-l-amber-400",
    bg: "bg-amber-50",
    badge: "bg-amber-100 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
  },
  suggestion: {
    leftBorder: "border-l-green-400",
    bg: "bg-green-50",
    badge: "bg-green-100 text-green-700 border-green-200",
    dot: "bg-green-500",
  },
};

function FileBlock({ file }: { file: ParsedFile }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left border-b border-gray-100"
      >
        <FileCode className="w-4 h-4 text-purple-500 flex-shrink-0" />
        <code className="text-sm text-gray-700 font-mono flex-1 truncate">{file.filename}</code>
        <div className="flex items-center gap-2 flex-shrink-0">
          {file.issues.filter((i) => i.severity === "bug").length > 0 && (
            <span className="px-2 py-0.5 rounded text-xs bg-red-100 text-red-700 border border-red-200">
              {file.issues.filter((i) => i.severity === "bug").length} bug
            </span>
          )}
          {file.issues.filter((i) => i.severity === "warning").length > 0 && (
            <span className="px-2 py-0.5 rounded text-xs bg-amber-100 text-amber-700 border border-amber-200">
              {file.issues.filter((i) => i.severity === "warning").length} warn
            </span>
          )}
          {file.issues.filter((i) => i.severity === "suggestion").length > 0 && (
            <span className="px-2 py-0.5 rounded text-xs bg-green-100 text-green-700 border border-green-200">
              {file.issues.filter((i) => i.severity === "suggestion").length} sugg
            </span>
          )}
          {collapsed ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </button>

      {!collapsed && (
        <div className="divide-y divide-gray-100">
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
                      <span className="text-xs text-gray-400 font-mono">Line {issue.line}</span>
                    )}
                    <span className="text-xs text-gray-400 ml-auto">{issue.confidence}% confident</span>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">{issue.description}</p>
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
      <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center animate-fade-in shadow-sm">
        <div className="text-3xl mb-3">✨</div>
        <h3 className="text-base font-semibold text-gray-900 mb-2">Clean code!</h3>
        <p className="text-gray-500 text-sm">No file-specific issues detected.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 animate-fade-in shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-base font-semibold text-gray-900">
          Annotated Files
          <span className="ml-1.5 text-sm text-gray-400 font-normal">
            ({files.length} file{files.length !== 1 ? "s" : ""} with issues)
          </span>
        </h3>
      </div>

      <div className="flex flex-col gap-3">
        {files.map((file) => (
          <FileBlock key={file.filename} file={file} />
        ))}
      </div>

      <p className="mt-4 text-xs text-gray-400 text-center">
        Files with AI-detected issues. See Issues panel for full details.
      </p>
    </div>
  );
}
