"use client";

import { useState, useCallback } from "react";
import { Github, Sparkles, MessageSquare, ExternalLink, X, Check, AlertTriangle } from "lucide-react";
import LandingInput from "@/components/LandingInput";
import LoadingSteps from "@/components/LoadingSteps";
import HealthScore from "@/components/HealthScore";
import SummaryCard from "@/components/SummaryCard";
import DiffViewer from "@/components/DiffViewer";
import IssuesPanel from "@/components/IssuesPanel";
import AnalysisHistory, { saveToHistory } from "@/components/AnalysisHistory";
import { analyzePR, postComment } from "@/lib/api";
import { AnalysisResult, LoadingStep } from "@/types";

interface Toast {
  id: string;
  type: "success" | "error" | "info";
  message: string;
  link?: { href: string; label: string };
}

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
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
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

      // Step 1: Fetching
      setLoadingStep("fetching");
      await new Promise((r) => setTimeout(r, 800));

      // Step 2: Filtering
      setLoadingStep("filtering");
      await new Promise((r) => setTimeout(r, 600));

      // Step 3: Analyzing
      setLoadingStep("analyzing");

      try {
        const data = await analyzePR(prUrl, strictMode, "deepseek-ai/deepseek-v3.2");
        setLoadingStep("done");
        setResult(data);

        // Show large PR warning if applicable
        if (data.total_changed_lines > 500) {
          setShowLargePRWarning(true);
        }

        // Save to history
        saveToHistory(data);

        addToast({
          type: "success",
          message: `Analysis complete! Health score: ${data.health_score}/100`,
        });
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
    (prUrl: string, strictMode: boolean) => {
      runAnalysis(prUrl, strictMode);
    },
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
        message: "Comment posted to GitHub!",
        link: { href: data.comment_url, label: "View on GitHub" },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to post comment.";
      addToast({ type: "error", message });
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
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800/60 bg-gray-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white leading-none">PR Code Reviewer</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Model indicator */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-900 border border-gray-800">
              <div className="w-2 h-2 rounded-full bg-purple-400 pulse-dot" />
              <span className="text-xs text-gray-400">Qwen2.5-Coder-32B</span>
            </div>

            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-gray-300 transition-colors"
            >
              <Github className="w-5 h-5" />
            </a>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">
        <div className="flex gap-8">
          {/* Sidebar - History */}
          <aside className="hidden lg:block w-72 flex-shrink-0">
            <div className="sticky top-24">
              <AnalysisHistory
                onSelectAnalysis={handleSelectHistory}
                currentUrl={url || undefined}
              />
            </div>
          </aside>

          {/* Main content */}
          <main className="flex-1 min-w-0">
            {/* Hero section - shown when no result */}
            {!hasResult && !isLoading && (
              <div className="text-center mb-10 animate-fade-in">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 mb-6">
                  <Sparkles className="w-4 h-4 text-blue-400" />
                  <span className="text-sm text-blue-300 font-medium">AI-Powered Code Review</span>
                </div>
                <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4 leading-tight">
                  Review PRs in{" "}
                  <span className="gradient-text">seconds, not hours</span>
                </h2>
                <p className="text-gray-400 text-lg max-w-xl mx-auto leading-relaxed">
                  Paste any GitHub PR URL and the agent will instantly analyze code quality, find bugs,
                  and give actionable feedback.
                </p>
              </div>
            )}

            {/* Input section */}
            <div className={`${hasResult || isLoading ? "mb-8" : "mb-12"}`}>
              <LandingInput
                onAnalyze={handleAnalyze}
                isLoading={isLoading}
                hasResult={hasResult}
                onHarsher={handleHarsher}
                hasUsedStrictMode={hasUsedStrictMode}
              />
            </div>

            {/* Large PR warning */}
            {showLargePRWarning && (
              <div className="mb-6 bg-yellow-500/10 border border-yellow-500/20 rounded-xl animate-fade-in overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
                  <p className="text-sm text-yellow-300">
                    Large PR detected ({result?.total_changed_lines}+ lines changed). Consider
                    splitting this PR for better reviewability and faster merges.
                  </p>
                  <button
                    onClick={() => setShowSplitTips((v) => !v)}
                    className="ml-auto text-xs font-medium text-yellow-400 hover:text-yellow-200 underline flex-shrink-0 whitespace-nowrap"
                  >
                    {showSplitTips ? "Hide tips" : "How to split?"}
                  </button>
                  <button
                    onClick={() => setShowLargePRWarning(false)}
                    className="text-yellow-600 hover:text-yellow-400 flex-shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                {showSplitTips && (
                  <div className="px-4 pb-4 border-t border-yellow-500/20 pt-3">
                    <p className="text-xs font-semibold text-yellow-400 mb-2 uppercase tracking-wide">Ways to split a large PR</p>
                    <ul className="space-y-2 text-sm text-yellow-200/80">
                      <li className="flex gap-2">
                        <span className="text-yellow-500 flex-shrink-0">1.</span>
                        <span><strong className="text-yellow-300">Separate refactoring from features</strong> — create one PR that only renames/restructures existing code (no behavior change), then a second PR that adds the new feature on top.</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-yellow-500 flex-shrink-0">2.</span>
                        <span><strong className="text-yellow-300">Split by layer</strong> — backend changes (DB schema, API routes) in one PR, frontend/UI changes in another.</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-yellow-500 flex-shrink-0">3.</span>
                        <span><strong className="text-yellow-300">Separate tests from implementation</strong> — merge the implementation first, then open a follow-up PR with tests (or vice versa with TDD).</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-yellow-500 flex-shrink-0">4.</span>
                        <span><strong className="text-yellow-300">Use a stacked PR workflow</strong> — PR #1 is a base branch with foundational changes, PR #2 targets PR #1 (not main). Merge in order. GitHub&apos;s &quot;stacked diffs&quot; tools (Graphite, ghstack) automate this.</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-yellow-500 flex-shrink-0">5.</span>
                        <span><strong className="text-yellow-300">Feature flags</strong> — merge incomplete feature code behind a disabled flag. Each incremental PR is safe to merge independently.</span>
                      </li>
                    </ul>
                    <p className="mt-3 text-xs text-yellow-500">
                      Tip: <code className="bg-yellow-500/10 px-1 rounded">git log --oneline origin/main..HEAD</code> lists your commits — each logical group is a candidate for its own PR.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Error state */}
            {error && !isLoading && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl animate-fade-in">
                <div className="flex items-start gap-3">
                  <div className="text-red-400 mt-0.5">
                    <X className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-red-300 mb-1">Analysis failed</p>
                    <p className="text-sm text-red-400/80">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Loading state */}
            {isLoading && <LoadingSteps currentStep={loadingStep} />}

            {/* Results */}
            {hasResult && result && !isLoading && (
              <div className="space-y-6 animate-slide-up">
                {/* Health score + Summary row */}
                <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-6 items-start">
                  <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex justify-center">
                    <HealthScore score={result.health_score} />
                  </div>
                  <SummaryCard result={result} />
                </div>

                {/* Issues panel */}
                <IssuesPanel issues={result.issues} />

                {/* Diff viewer */}
                {result.issues.length > 0 && <DiffViewer issues={result.issues} />}

                {/* Post to GitHub button */}
                <div className="flex justify-center pt-2 pb-6">
                  <button
                    onClick={handlePostComment}
                    disabled={isPostingComment}
                    className="flex items-center gap-2.5 px-6 py-3 rounded-xl font-semibold text-sm border border-gray-700 bg-gray-900 text-gray-300 hover:bg-gray-800 hover:border-gray-600 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <MessageSquare className="w-4 h-4" />
                    {isPostingComment ? "Posting comment..." : "Post review to GitHub"}
                  </button>
                </div>
              </div>
            )}

            {/* Empty state features */}
            {!hasResult && !isLoading && !error && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 animate-fade-in">
                {[
                  {
                    icon: "🔍",
                    title: "Deep Analysis",
                    desc: "Detects bugs, security issues, and code smells instantly",
                  },
                  {
                    icon: "⚡",
                    title: "Lightning Fast",
                    desc: "Complete review in under 30 seconds with adaptive thinking",
                  },
                  {
                    icon: "📊",
                    title: "Health Score",
                    desc: "Get a 0-100 quality score with actionable improvement tips",
                  },
                ].map((feat) => (
                  <div
                    key={feat.title}
                    className="p-5 bg-gray-900/50 border border-gray-800 rounded-2xl text-center"
                  >
                    <div className="text-3xl mb-3">{feat.icon}</div>
                    <h3 className="font-semibold text-white text-sm mb-1.5">{feat.title}</h3>
                    <p className="text-gray-500 text-xs leading-relaxed">{feat.desc}</p>
                  </div>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Toast notifications */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 items-end">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-2xl max-w-sm toast-enter ${
              toast.type === "success"
                ? "bg-green-950 border-green-800 text-green-200"
                : toast.type === "error"
                ? "bg-red-950 border-red-800 text-red-200"
                : "bg-gray-900 border-gray-700 text-gray-200"
            }`}
          >
            {toast.type === "success" && <Check className="w-4 h-4 text-green-400 flex-shrink-0" />}
            {toast.type === "error" && <X className="w-4 h-4 text-red-400 flex-shrink-0" />}
            {toast.type === "info" && <Sparkles className="w-4 h-4 text-blue-400 flex-shrink-0" />}
            <p className="text-sm flex-1">{toast.message}</p>
            {toast.link && (
              <a
                href={toast.link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs font-medium underline opacity-80 hover:opacity-100 flex-shrink-0"
              >
                {toast.link.label}
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
            <button
              onClick={() => removeToast(toast.id)}
              className="opacity-60 hover:opacity-100 flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-800/50 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between text-xs text-gray-600">
          <span>PR Code Reviewer</span>
          <span>Built with Next.js + FastAPI</span>
        </div>
      </footer>
    </div>
  );
}
