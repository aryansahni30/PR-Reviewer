"use client";

import { useState, useEffect } from "react";
import { Search, Zap, Check, AlertTriangle, X } from "lucide-react";

interface LandingInputProps {
  onAnalyze: (url: string, strictMode: boolean) => void;
  isLoading: boolean;
  hasResult: boolean;
  onHarsher: () => void;
  hasUsedStrictMode: boolean;
}

const SAMPLE_PRS = [
  { label: "react", url: "https://github.com/facebook/react/pull/31901" },
  { label: "vscode", url: "https://github.com/microsoft/vscode/pull/243992" },
  { label: "next.js", url: "https://github.com/vercel/next.js/pull/75453" },
];

const ROTATING_PLACEHOLDERS = [
  "https://github.com/facebook/react/pull/31901",
  "https://github.com/microsoft/vscode/pull/243992",
  "https://github.com/vercel/next.js/pull/75453",
];

const isValidGitHubPRUrl = (val: string): boolean =>
  /^https?:\/\/github\.com\/[^/]+\/[^/]+\/pull\/\d+/.test(val);

export default function LandingInput({
  onAnalyze,
  isLoading,
  hasResult,
  onHarsher,
  hasUsedStrictMode,
}: LandingInputProps) {
  const [url, setUrl] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [placeholderOpacity, setPlaceholderOpacity] = useState(1);
  const [toast, setToast] = useState<string | null>(null);

  const isValid = isValidGitHubPRUrl(url);

  // Rotate placeholder when input is empty and unfocused
  useEffect(() => {
    if (url || isFocused) return;
    const interval = setInterval(() => {
      setPlaceholderOpacity(0);
      setTimeout(() => {
        setPlaceholderIndex((i) => (i + 1) % ROTATING_PLACEHOLDERS.length);
        setPlaceholderOpacity(1);
      }, 280);
    }, 3200);
    return () => clearInterval(interval);
  }, [url, isFocused]);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    if (!isValid) {
      showToast(
        "Please enter a valid GitHub PR URL — e.g. https://github.com/owner/repo/pull/123"
      );
      return;
    }
    onAnalyze(url.trim(), false);
  };

  return (
    <div className="relative">
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 max-w-sm px-4 py-3 bg-white border border-gray-200 rounded-xl shadow-lg flex items-center gap-3 toast-enter">
          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <p className="text-sm text-gray-700 flex-1">{toast}</p>
          <button
            onClick={() => setToast(null)}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Sample PR chips — shown only on landing */}
      {!hasResult && !isLoading && (
        <div className="mb-3 flex flex-wrap gap-2">
          {SAMPLE_PRS.map((s) => (
            <button
              key={s.url}
              type="button"
              onClick={() => setUrl(s.url)}
              className="px-3 py-1.5 rounded-lg text-xs text-gray-500 bg-white border border-gray-200 hover:border-purple-300 hover:text-purple-600 transition-all shadow-sm"
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      {/* Input bar */}
      <form onSubmit={handleSubmit}>
        <div
          className={`relative flex items-center bg-white border-2 rounded-2xl overflow-hidden transition-all duration-200 shadow-sm ${
            isFocused
              ? "border-purple-500 input-glow"
              : isValid
              ? "border-green-400 shadow-green-100"
              : "border-gray-200 hover:border-gray-300"
          }`}
        >
          {/* Search icon */}
          <div className="pl-4 pr-3 flex-shrink-0">
            <Search
              className={`w-5 h-5 transition-colors ${
                isFocused ? "text-purple-500" : "text-gray-400"
              }`}
            />
          </div>

          {/* Input + rotating placeholder */}
          <div className="relative flex-1 min-w-0">
            {/* Fake rotating placeholder — only when empty */}
            {!url && (
              <div
                className="absolute inset-0 flex items-center pointer-events-none"
                style={{
                  opacity: isFocused ? 0 : placeholderOpacity,
                  transition: "opacity 0.28s ease",
                }}
              >
                <span className="text-gray-400 text-sm truncate font-mono">
                  {ROTATING_PLACEHOLDERS[placeholderIndex]}
                </span>
              </div>
            )}
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={isFocused && !url ? "https://github.com/owner/repo/pull/123" : ""}
              disabled={isLoading}
              className="w-full py-4 text-sm text-gray-900 bg-transparent outline-none disabled:opacity-50 disabled:cursor-not-allowed font-mono"
            />
          </div>

          {/* Valid URL indicator */}
          {isValid && !isLoading && (
            <div className="flex items-center gap-1.5 pr-3 flex-shrink-0">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-xs text-green-600 font-medium hidden sm:block whitespace-nowrap">
                Valid GitHub PR
              </span>
            </div>
          )}

          {/* Analyze button — inside the bar */}
          <div className="pr-2 flex-shrink-0">
            <button
              type="submit"
              disabled={isLoading || !url.trim()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white text-sm bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 shadow-sm whitespace-nowrap"
            >
              <Zap className="w-4 h-4" />
              {isLoading ? "Analyzing…" : "Analyze PR"}
            </button>
          </div>
        </div>
      </form>

      {/* Re-analyze in strict mode — shown once after a result */}
      {hasResult && !isLoading && !hasUsedStrictMode && (
        <div className="mt-4 flex justify-center">
          <button
            onClick={onHarsher}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium border border-orange-200 bg-orange-50 text-orange-600 hover:bg-orange-100 hover:border-orange-300 transition-all"
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
