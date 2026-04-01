"use client";

import { HistoryEntry, AnalysisResult } from "@/types";

export function historyKey(userId?: string | null): string {
  return userId ? `pr_review_history_${userId}` : "pr_review_history";
}

// Utility to save to history — used by page.tsx
export function saveToHistory(result: AnalysisResult, userId?: string | null): void {
  try {
    const key = historyKey(userId);
    const stored = localStorage.getItem(key);
    let history: HistoryEntry[] = stored ? JSON.parse(stored) : [];
    history = history.filter((e) => e.result.pr_url !== result.pr_url);
    const newEntry: HistoryEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      result,
      analyzedAt: Date.now(),
    };
    history.unshift(newEntry);
    history = history.slice(0, 5);
    localStorage.setItem(key, JSON.stringify(history));
  } catch {
    // ignore localStorage errors
  }
}

// Default export kept for backwards compatibility (not used in current layout)
export default function AnalysisHistory() {
  return null;
}
