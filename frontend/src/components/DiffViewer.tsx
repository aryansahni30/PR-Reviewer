"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, FileCode } from "lucide-react";
import { Issue } from "@/types";

interface DiffViewerProps {
  issues: Issue[];
}

interface ParsedFile {
  filename: string;
  lines: { type: "added" | "removed" | "context" | "hunk"; content: string; lineNum?: number }[];
  issues: Issue[];
}

function parseDiffToFiles(issues: Issue[]): ParsedFile[] {
  // Group issues by file
  const fileMap = new Map<string, Issue[]>();
  for (const issue of issues) {
    const existing = fileMap.get(issue.file) || [];
    existing.push(issue);
    fileMap.set(issue.file, existing);
  }

  // Create file entries with representative content for each file's issues
  const files: ParsedFile[] = [];
  fileMap.forEach((fileIssues, filename) => {
    files.push({ filename, lines: [], issues: fileIssues });
  });

  return files;
}

const severityStyles = {
  bug: {
    badge: "bg-red-500/20 text-red-400 border border-red-500/30",
    dot: "bg-red-500",
    emoji: "🔴",
  },
  warning: {
    badge: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
    dot: "bg-yellow-500",
    emoji: "🟡",
  },
  suggestion: {
    badge: "bg-green-500/20 text-green-400 border border-green-500/30",
    dot: "bg-green-500",
    emoji: "🟢",
  },
};

interface FileBlockProps {
  file: ParsedFile;
}

function FileBlock({ file }: FileBlockProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="border border-gray-800 rounded-xl overflow-hidden">
      {/* File header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-gray-800/60 hover:bg-gray-800 transition-colors text-left"
      >
        <FileCode className="w-4 h-4 text-blue-400 flex-shrink-0" />
        <code className="text-sm text-gray-200 font-mono flex-1 truncate">{file.filename}</code>
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Issue count badges */}
          {file.issues.filter((i) => i.severity === "bug").length > 0 && (
            <span className="px-2 py-0.5 rounded text-xs bg-red-500/20 text-red-400">
              {file.issues.filter((i) => i.severity === "bug").length} bug
            </span>
          )}
          {file.issues.filter((i) => i.severity === "warning").length > 0 && (
            <span className="px-2 py-0.5 rounded text-xs bg-yellow-500/20 text-yellow-400">
              {file.issues.filter((i) => i.severity === "warning").length} warn
            </span>
          )}
          {file.issues.filter((i) => i.severity === "suggestion").length > 0 && (
            <span className="px-2 py-0.5 rounded text-xs bg-green-500/20 text-green-400">
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

      {/* Issues list for this file */}
      {!collapsed && (
        <div className="divide-y divide-gray-800/50">
          {file.issues.map((issue, idx) => {
            const style = severityStyles[issue.severity];
            return (
              <div
                key={idx}
                className="flex items-start gap-3 px-4 py-3 bg-gray-950/40 hover:bg-gray-900/40 transition-colors"
              >
                <div className={`flex-shrink-0 mt-1 w-2 h-2 rounded-full ${style.dot}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${style.badge}`}>
                      {style.emoji} {issue.severity}
                    </span>
                    {issue.line > 0 && (
                      <span className="text-xs text-gray-500 font-mono">Line {issue.line}</span>
                    )}
                    <span className="text-xs text-gray-600 ml-auto">{issue.confidence}% confident</span>
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
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center animate-fade-in">
        <div className="text-3xl mb-3">✨</div>
        <h3 className="text-base font-semibold text-white mb-2">Clean Code!</h3>
        <p className="text-gray-400 text-sm">No file-specific issues detected by the AI.</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-base font-semibold text-white">
          Annotated Files
          <span className="ml-1.5 text-sm text-gray-500 font-normal">({files.length} files with issues)</span>
        </h3>
      </div>

      <div className="flex flex-col gap-3">
        {files.map((file) => (
          <FileBlock key={file.filename} file={file} />
        ))}
      </div>

      <p className="mt-4 text-xs text-gray-600 text-center">
        Showing files with AI-detected issues. See Issues panel for full details.
      </p>
    </div>
  );
}
