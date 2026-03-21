"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Github,
  MessageSquare,
  ExternalLink,
  X,
  Check,
  AlertTriangle,
  ArrowRight,
  Clock,
} from "lucide-react";
import LandingInput from "@/components/LandingInput";
import LoadingSteps from "@/components/LoadingSteps";
import HealthScore from "@/components/HealthScore";
import SummaryCard from "@/components/SummaryCard";
import DiffViewer from "@/components/DiffViewer";
import IssuesPanel from "@/components/IssuesPanel";
import { saveToHistory } from "@/components/AnalysisHistory";
import { analyzePR, postComment } from "@/lib/api";
import { AnalysisResult, HistoryEntry, LoadingStep } from "@/types";

interface Toast {
  id: string;
  type: "success" | "error" | "info";
  message: string;
  link?: { href: string; label: string };
}

// ─── Recent analyses horizontal strip ────────────────────────────────────────
function HistoryStrip({ onSelect }: { onSelect: (result: AnalysisResult) => void }) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("pr_review_history");
      if (stored) setHistory(JSON.parse(stored));
    } catch {
      /* ignore */
    }
  }, []);

  if (history.length === 0) return null;

  return (
    <div className="mt-4 flex items-center gap-3 overflow-x-auto pb-1">
      <div className="flex items-center gap-1 flex-shrink-0">
        <Clock className="w-3.5 h-3.5 text-gray-400" />
        <span className="text-xs text-gray-400 font-medium">Recent</span>
      </div>
      {history.slice(0, 5).map((entry) => {
        const score = entry.result.health_score;
        const scoreColor =
          score >= 71 ? "text-green-600" : score >= 41 ? "text-amber-600" : "text-red-600";
        return (
          <button
            key={entry.id}
            onClick={() => onSelect(entry.result)}
            className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs border border-gray-200 bg-white text-gray-600 hover:border-purple-300 hover:text-purple-700 transition-all shadow-sm"
          >
            <span className="max-w-[140px] truncate">{entry.result.pr_title}</span>
            <span className={`font-bold ${scoreColor}`}>{score}</span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Mock preview card ────────────────────────────────────────────────────────
function MockPreview() {
  const focusInput = () => {
    const input = document.querySelector("input[type='url']") as HTMLInputElement | null;
    if (input) {
      input.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => input.focus(), 300);
    }
  };

  return (
    <div className="relative mt-10 rounded-2xl overflow-hidden">
      {/* Blurred mock */}
      <div
        className="pointer-events-none select-none"
        style={{ filter: "blur(3px)", opacity: 0.48 }}
        aria-hidden="true"
      >
        <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-4 mb-4">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 flex justify-center items-center">
            <div className="flex flex-col items-center gap-2">
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center"
                style={{ border: "8px solid #22c55e", boxShadow: "0 0 20px rgba(34,197,94,0.2)" }}
              >
                <span className="text-2xl font-bold text-green-600">84</span>
              </div>
              <span className="text-xs text-gray-500 font-medium">Health Score</span>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <h3 className="text-base font-bold text-gray-900 mb-1 truncate">
              feat: add concurrent rendering for async state updates
            </h3>
            <div className="flex items-center gap-2 text-sm text-gray-400 mb-3">
              <span>sophiebits</span>
              <span>·</span>
              <span>facebook/react</span>
              <span>·</span>
              <span>#31901</span>
            </div>
            <p className="text-gray-600 text-sm mb-3 line-clamp-2">
              Well-structured PR improving render performance. The concurrent approach is sound,
              though a few edge cases around error boundaries need attention.
            </p>
            <div className="flex gap-2">
              <span className="px-2.5 py-1 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600 font-medium">
                1 bug
              </span>
              <span className="px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-600 font-medium">
                3 warnings
              </span>
              <span className="px-2.5 py-1 bg-green-50 border border-green-200 rounded-lg text-xs text-green-600 font-medium">
                4 suggestions
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3">
          {[
            {
              type: "bug" as const,
              file: "src/react-reconciler/ReactFiber.ts",
              text: "Race condition in useTransition when two concurrent renders access shared state simultaneously",
            },
            {
              type: "warning" as const,
              file: "src/hooks/useEffect.ts",
              text: "Missing cleanup function for AbortController — may cause memory leaks on unmount",
            },
            {
              type: "suggestion" as const,
              file: "src/scheduler/Scheduler.ts",
              text: "Consider memoizing the selector with useMemo to avoid unnecessary re-renders in hot paths",
            },
          ].map((issue, i) => (
            <div
              key={i}
              className={`pl-4 border-l-4 rounded-r-xl p-3 ${
                issue.type === "bug"
                  ? "border-l-red-400 bg-red-50"
                  : issue.type === "warning"
                  ? "border-l-amber-400 bg-amber-50"
                  : "border-l-green-400 bg-green-50"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`text-xs font-bold uppercase ${
                    issue.type === "bug"
                      ? "text-red-600"
                      : issue.type === "warning"
                      ? "text-amber-600"
                      : "text-green-600"
                  }`}
                >
                  {issue.type}
                </span>
                <code className="text-xs text-gray-400 font-mono truncate">{issue.file}</code>
              </div>
              <p className="text-sm text-gray-700">{issue.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-end pb-12 bg-gradient-to-t from-[#FAFAFA] via-[#FAFAFA]/75 to-transparent">
        <p className="text-sm text-gray-500 mb-3">Your results will appear here</p>
        <button
          onClick={focusInput}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-purple-600 text-white font-semibold text-sm hover:bg-purple-700 transition-all shadow-lg shadow-purple-200 active:scale-95"
        >
          Analyze your first PR
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function HomePage() {
  const [url, setUrl] = useState("");
  const [loadingStep, setLoadingStep] = useState<LoadingStep>("idle");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [showLargePRWarning, setShowLargePRWarning] = useState(false);
  const [showSplitTips, setShowSplitTips] = useState(false);
  const [hasUsedStrictMode, setHasUsedStrictMode] = useState(false);

  const addToast = useCallback((toast: Omit<Toast, "id">) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const runAnalysis = useCallback(
    async (prUrl: string, strictMode: boolean) => {
      setUrl(prUrl);
      setError(null);
      setResult(null);
      setShowLargePRWarning(false);
      setShowSplitTips(false);
      if (!strictMode) setHasUsedStrictMode(false);

      setLoadingStep("fetching");
      await new Promise((r) => setTimeout(r, 800));
      setLoadingStep("filtering");
      await new Promise((r) => setTimeout(r, 600));
      setLoadingStep("analyzing");

      try {
        const data = await analyzePR(prUrl, strictMode, "deepseek-ai/deepseek-v3.2");
        setLoadingStep("done");
        setResult(data);
        if (data.total_changed_lines > 500) setShowLargePRWarning(true);
        saveToHistory(data);
        addToast({ type: "success", message: `Analysis complete — health score: ${data.health_score}/100` });
      } catch (err) {
        setLoadingStep("idle");
        const message = err instanceof Error ? err.message : "Analysis failed. Please try again.";
        setError(message);
        addToast({ type: "error", message });
      }
    },
    [addToast]
  );

  const handleAnalyze = useCallback(
    (prUrl: string, strictMode: boolean) => runAnalysis(prUrl, strictMode),
    [runAnalysis]
  );

  const handleHarsher = useCallback(() => {
    if (url) {
      setHasUsedStrictMode(true);
      runAnalysis(url, true);
    }
  }, [url, runAnalysis]);

  const handlePostComment = useCallback(async () => {
    if (!result) return;
    setIsPostingComment(true);
    try {
      const data = await postComment(result.pr_url, result);
      addToast({
        type: "success",
        message: "Review posted to GitHub!",
        link: { href: data.comment_url, label: "View on GitHub" },
      });
    } catch (err) {
      addToast({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to post comment.",
      });
    } finally {
      setIsPostingComment(false);
    }
  }, [result, addToast]);

  const handleSelectHistory = useCallback((historicalResult: AnalysisResult) => {
    setResult(historicalResult);
    setUrl(historicalResult.pr_url);
    setLoadingStep("done");
    setError(null);
  }, []);

  const isLoading = loadingStep !== "idle" && loadingStep !== "done";
  const hasResult = result !== null;

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-200/80">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-600 to-violet-600 flex items-center justify-center shadow-sm">
              <span className="text-white text-xs font-bold leading-none">PR</span>
            </div>
            <span className="text-sm font-semibold text-gray-900 tracking-tight">PR Reviewer</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200">
              <div className="w-2 h-2 rounded-full bg-purple-500 pulse-dot" />
              <span className="text-xs text-gray-500">Qwen2.5-Coder-32B</span>
            </div>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-gray-700 transition-colors"
            >
              <Github className="w-5 h-5" />
            </a>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-12">
        {/* Landing state */}
        {!hasResult && !isLoading && (
          <div className="animate-fade-in">
            <div className="text-center mb-10">
              <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4 leading-tight tracking-tight">
                Your senior engineer
                <br />
                is busy.{" "}
                <span className="gradient-text">We&apos;re not.</span>
              </h1>
              <p className="text-gray-500 text-lg max-w-lg mx-auto leading-relaxed">
                Paste any GitHub PR URL and get thorough code review before your reviewer
                even opens the tab.
              </p>
            </div>

            <LandingInput
              onAnalyze={handleAnalyze}
              isLoading={isLoading}
              hasResult={hasResult}
              onHarsher={handleHarsher}
              hasUsedStrictMode={hasUsedStrictMode}
            />

            <HistoryStrip onSelect={handleSelectHistory} />
            <MockPreview />
          </div>
        )}

        {/* Compact input when loading or showing result */}
        {(hasResult || isLoading) && (
          <div className="mb-8">
            <LandingInput
              onAnalyze={handleAnalyze}
              isLoading={isLoading}
              hasResult={hasResult}
              onHarsher={handleHarsher}
              hasUsedStrictMode={hasUsedStrictMode}
            />
          </div>
        )}

        {/* Large PR warning */}
        {showLargePRWarning && (
          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl animate-fade-in overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3">
              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
              <p className="text-sm text-amber-800">
                Large PR ({result?.total_changed_lines}+ lines). Consider splitting for easier review.
              </p>
              <button
                onClick={() => setShowSplitTips((v) => !v)}
                className="ml-auto text-xs font-medium text-amber-600 hover:text-amber-800 underline flex-shrink-0 whitespace-nowrap"
              >
                {showSplitTips ? "Hide tips" : "How to split?"}
              </button>
              <button
                onClick={() => setShowLargePRWarning(false)}
                className="text-amber-400 hover:text-amber-600 flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {showSplitTips && (
              <div className="px-4 pb-4 border-t border-amber-200 pt-3">
                <p className="text-xs font-semibold text-amber-700 mb-2 uppercase tracking-wide">
                  Ways to split a large PR
                </p>
                <ul className="space-y-2 text-sm text-amber-900/80">
                  {[
                    ["Refactor first, feature second", "One PR restructures (no behavior change), a second adds the feature on top."],
                    ["Split by layer", "Backend (DB, API) in one PR, frontend in another."],
                    ["Tests separate from implementation", "Merge implementation first, follow up with tests."],
                    ["Stacked PRs", "PR #1 is base, PR #2 targets PR #1. Use Graphite or ghstack to automate."],
                    ["Feature flags", "Merge incomplete code behind a disabled flag — each PR lands safely alone."],
                  ].map(([title, desc], i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-amber-500 flex-shrink-0 font-medium">{i + 1}.</span>
                      <span>
                        <strong className="text-amber-800">{title}</strong> — {desc}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {error && !isLoading && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl animate-fade-in">
            <div className="flex items-start gap-3">
              <X className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-red-700 mb-1">Analysis failed</p>
                <p className="text-sm text-red-600/80">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Loading */}
        {isLoading && <LoadingSteps currentStep={loadingStep} />}

        {/* Results */}
        {hasResult && result && !isLoading && (
          <div className="space-y-5 animate-slide-up">
            <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-5 items-start">
              <div className="bg-white border border-gray-200 rounded-2xl p-6 flex justify-center shadow-sm">
                <HealthScore score={result.health_score} />
              </div>
              <SummaryCard result={result} />
            </div>

            <IssuesPanel issues={result.issues} />

            {result.issues.length > 0 && <DiffViewer issues={result.issues} />}

            <div className="flex justify-center pt-2 pb-6">
              <button
                onClick={handlePostComment}
                disabled={isPostingComment}
                className="flex items-center gap-2.5 px-6 py-3 rounded-xl font-semibold text-sm border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                <MessageSquare className="w-4 h-4" />
                {isPostingComment ? "Posting…" : "Post review to GitHub"}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Toast notifications */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 items-end">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg max-w-sm toast-enter ${
              toast.type === "success"
                ? "bg-white border-green-200 text-green-800"
                : toast.type === "error"
                ? "bg-white border-red-200 text-red-800"
                : "bg-white border-gray-200 text-gray-800"
            }`}
          >
            {toast.type === "success" && <Check className="w-4 h-4 text-green-500 flex-shrink-0" />}
            {toast.type === "error" && <X className="w-4 h-4 text-red-500 flex-shrink-0" />}
            <p className="text-sm flex-1">{toast.message}</p>
            {toast.link && (
              <a
                href={toast.link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs font-medium underline opacity-70 hover:opacity-100 flex-shrink-0"
              >
                {toast.link.label}
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
            <button onClick={() => removeToast(toast.id)} className="opacity-50 hover:opacity-100 flex-shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200/80 py-5 mt-auto">
        <div className="max-w-3xl mx-auto px-6 flex items-center justify-between text-xs text-gray-400">
          <span>PR Reviewer</span>
          <span>Next.js + FastAPI</span>
        </div>
      </footer>
    </div>
  );
}
