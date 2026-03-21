"use client";

import { useState, useEffect } from "react";
import { Search, Zap, AlertTriangle, X } from "lucide-react";

interface LandingInputProps {
  onAnalyze: (url: string, strictMode: boolean) => void;
  isLoading: boolean;
  hasResult: boolean;
  onHarsher: () => void;
  hasUsedStrictMode: boolean;
}

export default function LandingInput({
  onAnalyze,
  isLoading,
  hasResult,
  onHarsher,
  hasUsedStrictMode,
}: LandingInputProps) {
  const [url, setUrl] = useState("");
  const [showLargePRWarning, setShowLargePRWarning] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const isValidGitHubPRUrl = (val: string): boolean => {
    return /^https?:\/\/github\.com\/[^/]+\/[^/]+\/pull\/\d+/.test(val);
  };

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    if (!isValidGitHubPRUrl(url)) {
      showToast("Please enter a valid GitHub PR URL (e.g. https://github.com/owner/repo/pull/123)");
      return;
    }
    onAnalyze(url.trim(), false);
  };

  const handleUrlChange = (val: string) => {
    setUrl(val);
    // Show large PR warning if URL looks valid and user has typed something
    // We'll update this when we actually have the line count from the result
    setShowLargePRWarning(false);
  };

  return (
    <div className="relative">
      {/* Toast notification */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 max-w-sm px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl flex items-center gap-3 toast-enter">
          <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0" />
          <p className="text-sm text-gray-200 flex-1">{toast}</p>
          <button onClick={() => setToast(null)} className="text-gray-500 hover:text-gray-300">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Sample PR suggestions */}
      {!hasResult && !isLoading && (
        <div className="mb-3 flex flex-wrap gap-2">
          {[
            { label: "react", url: "https://github.com/facebook/react/pull/31901" },
            { label: "vscode", url: "https://github.com/microsoft/vscode/pull/243992" },
            { label: "next.js", url: "https://github.com/vercel/next.js/pull/75453" },
          ].map((s) => (
            <button
              key={s.url}
              type="button"
              onClick={() => setUrl(s.url)}
              className="px-3 py-1 rounded-lg text-xs text-gray-400 bg-gray-900 border border-gray-800 hover:border-gray-600 hover:text-gray-200 transition-all"
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      {/* Main input form */}
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative flex items-center gap-3">
          <div className="relative flex-1">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
              <Search className="w-5 h-5" />
            </div>
            <input
              type="url"
              value={url}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder="https://github.com/owner/repo/pull/123"
              disabled={isLoading}
              className="w-full pl-12 pr-4 py-4 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder-gray-600 text-base focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || !url.trim()}
            className="flex-shrink-0 flex items-center gap-2.5 px-6 py-4 rounded-xl font-semibold text-white text-sm bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 active:scale-95"
          >
            <Zap className="w-4 h-4" />
            {isLoading ? "Analyzing..." : "Analyze PR"}
          </button>
        </div>
      </form>

      {/* Large PR warning */}
      {showLargePRWarning && (
        <div className="mt-3 flex items-center gap-2 px-4 py-2.5 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0" />
          <p className="text-sm text-yellow-300">
            Large PR detected (&gt;500 lines). Consider splitting this PR for better reviewability.
          </p>
          <button
            onClick={() => setShowLargePRWarning(false)}
            className="ml-auto text-yellow-500 hover:text-yellow-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Re-analyze with stricter mode - shown after first analysis, hidden after used */}
      {hasResult && !isLoading && !hasUsedStrictMode && (
        <div className="mt-4 flex justify-center">
          <button
            onClick={onHarsher}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium border border-orange-500/30 bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 hover:border-orange-500/50 transition-all"
          >
            Re-analyze with stricter mode
          </button>
        </div>
      )}
    </div>
  );
}

export function useLargePRWarning(totalChangedLines: number | undefined) {
  return totalChangedLines !== undefined && totalChangedLines > 500;
}
