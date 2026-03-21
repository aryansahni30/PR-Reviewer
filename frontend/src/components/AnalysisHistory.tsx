"use client";

import { useState, useEffect } from "react";
import { Clock, Trash2, History, ExternalLink } from "lucide-react";
import { HistoryEntry, AnalysisResult } from "@/types";

interface AnalysisHistoryProps {
  onSelectAnalysis: (result: AnalysisResult) => void;
  currentUrl?: string;
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function HealthBadge({ score }: { score: number }) {
  let color: string;
  if (score >= 71) color = "bg-green-500/20 text-green-400 border-green-500/30";
  else if (score >= 41) color = "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
  else color = "bg-red-500/20 text-red-400 border-red-500/30";

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${color}`}>{score}</span>
  );
}

export default function AnalysisHistory({ onSelectAnalysis, currentUrl }: AnalysisHistoryProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = () => {
    try {
      const stored = localStorage.getItem("pr_review_history");
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch {
      setHistory([]);
    }
  };

  const clearHistory = () => {
    localStorage.removeItem("pr_review_history");
    setHistory([]);
  };

  if (history.length === 0) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <History className="w-4 h-4 text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-400">Recent Analyses</h3>
        </div>
        <div className="text-center py-4">
          <Clock className="w-8 h-8 text-gray-700 mx-auto mb-2" />
          <p className="text-xs text-gray-600">No history yet. Analyze a PR to get started!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-300">Recent Analyses</h3>
          <span className="text-xs text-gray-600">({history.length})</span>
        </div>
        <button
          onClick={clearHistory}
          className="flex items-center gap-1 text-xs text-gray-600 hover:text-red-400 transition-colors"
          title="Clear history"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Clear
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {history.slice(0, 5).map((entry) => {
          const isActive = entry.result.pr_url === currentUrl;
          return (
            <button
              key={entry.id}
              onClick={() => onSelectAnalysis(entry.result)}
              className={`w-full text-left p-3 rounded-xl border transition-all hover:bg-gray-800/80 ${
                isActive
                  ? "border-blue-500/40 bg-blue-500/5"
                  : "border-gray-800 bg-gray-900/40 hover:border-gray-700"
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <p className="text-xs text-white font-medium leading-snug truncate flex-1">
                  {entry.result.pr_title}
                </p>
                <HealthBadge score={entry.result.health_score} />
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span className="truncate">{entry.result.repo_name}</span>
                <span>·</span>
                <span className="flex-shrink-0">{formatRelativeTime(entry.analyzedAt)}</span>
              </div>
              <div className="flex items-center gap-1 mt-1.5 text-xs text-gray-600">
                <ExternalLink className="w-3 h-3" />
                <span className="truncate text-blue-500/60 hover:text-blue-400 transition-colors">
                  PR #{entry.result.pr_number}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Utility to save to history
export function saveToHistory(result: AnalysisResult): void {
  try {
    const stored = localStorage.getItem("pr_review_history");
    let history: HistoryEntry[] = stored ? JSON.parse(stored) : [];

    // Remove duplicate if same URL
    history = history.filter((e) => e.result.pr_url !== result.pr_url);

    const newEntry: HistoryEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      result,
      analyzedAt: Date.now(),
    };

    history.unshift(newEntry);
    history = history.slice(0, 5); // Keep only last 5

    localStorage.setItem("pr_review_history", JSON.stringify(history));
  } catch {
    // Ignore localStorage errors
  }
}
