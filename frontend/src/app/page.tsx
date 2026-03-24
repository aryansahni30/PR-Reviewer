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
  Zap,
} from "lucide-react";
import LandingInput from "@/components/LandingInput";
import ProgressFeed from "@/components/ProgressFeed";
import HealthScore from "@/components/HealthScore";
import SummaryCard from "@/components/SummaryCard";
import InlineDiffReview from "@/components/InlineDiffReview";
import { saveToHistory } from "@/components/AnalysisHistory";
import { analyzePR, postComment, getPRFiles } from "@/lib/api";
import { AnalysisResult, HistoryEntry, ProgressStep } from "@/types";

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
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4 text-gray-500" />
        <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Recent Analyses</span>
      </div>
      <div className="flex flex-wrap gap-2">
      {history.slice(0, 3).map((entry) => {
        const score = entry.result.health_score;
        const scoreColor =
          score >= 71 ? "text-teal-success" : score >= 41 ? "text-amber-primary" : "text-red-400";
        return (
          <button
            key={entry.id}
            onClick={() => onSelect(entry.result)}
            className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs border border-white/5 bg-white/5 text-gray-300 hover:border-amber-primary/50 hover:bg-amber-900/10 transition-all shadow-sm"
          >
            <span className="max-w-[120px] truncate">{entry.result.pr_title}</span>
            <span className={`font-bold ${scoreColor}`}>{score}</span>
          </button>
        );
      })}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function HomePage() {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const INITIAL_STEPS: ProgressStep[] = [
    { id: "connecting",    label: "Connecting to GitHub",  status: "pending" },
    { id: "fetching",      label: "Fetching PR diff",       status: "pending" },
    { id: "loading_files", label: "Loading file contexts",  status: "pending" },
    { id: "analyzing",     label: "Analyzing with AI",      status: "pending" },
    { id: "compiling",     label: "Compiling results",      status: "pending" },
  ];
  const [progressSteps, setProgressSteps] = useState<ProgressStep[]>(INITIAL_STEPS);
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

  // ── Step state helpers ────────────────────────────────────────────────────
  const activateStep = useCallback(
    (id: ProgressStep["id"], detail?: string) => {
      setProgressSteps((prev) =>
        prev.map((s) =>
          s.id === id
            ? { ...s, status: "active", detail, startedAt: Date.now() }
            : s
        )
      );
    },
    []
  );

  const completeStep = useCallback(
    (id: ProgressStep["id"], detail?: string) => {
      setProgressSteps((prev) =>
        prev.map((s) =>
          s.id === id
            ? { ...s, status: "done", detail: detail ?? s.detail, durationMs: s.startedAt ? Date.now() - s.startedAt : 0 }
            : s
        )
      );
    },
    []
  );

  const setScanningFile = useCallback(
    (file: string) => {
      setProgressSteps((prev) =>
        prev.map((s) => (s.id === "analyzing" ? { ...s, scanningFile: file } : s))
      );
    },
    []
  );

  const runAnalysis = useCallback(
    async (prUrl: string, strictMode: boolean, selectedModel: string = "deepseek-ai/deepseek-v3.2") => {
      setUrl(prUrl);
      setError(null);
      setResult(null);
      setShowLargePRWarning(false);
      setShowSplitTips(false);
      if (!strictMode) setHasUsedStrictMode(false);

      // Reset steps
      setProgressSteps([
        { id: "connecting",    label: "Connecting to GitHub",  status: "pending" },
        { id: "fetching",      label: "Fetching PR diff",       status: "pending" },
        { id: "loading_files", label: "Loading file contexts",  status: "pending" },
        { id: "analyzing",     label: "Analyzing with AI",      status: "pending" },
        { id: "compiling",     label: "Compiling results",      status: "pending" },
      ]);

      // Extract repo slug from URL for display (e.g. "owner/repo #123")
      const repoSlug = (() => {
        try {
          const parts = prUrl.split("github.com/")[1]?.split("/") ?? [];
          return parts.length >= 4 ? `${parts[0]}/${parts[1]} #${parts[3]}` : prUrl;
        } catch { return prUrl; }
      })();

      // ── Step 1: Connecting ────────────────────────────────────────────────
      activateStep("connecting", repoSlug);
      await new Promise((r) => setTimeout(r, 350));
      completeStep("connecting");

      // ── Step 2: Fetch diff + file list (concurrent pre-flight) ────────────
      activateStep("fetching");

      // Fire pre-flight file list AND main analysis at the same time
      let filesPromise: Promise<{ files: string[]; total_changed_lines: number }> =
        getPRFiles(prUrl).catch(() => ({ files: [], total_changed_lines: 0 }));
      let analysisPromise = analyzePR(prUrl, strictMode, selectedModel);

      // When file list comes back, move to next steps and start cycling
      filesPromise.then(({ files, total_changed_lines }) => {
        completeStep("fetching", `${total_changed_lines} lines changed`);
        activateStep(
          "loading_files",
          `${files.length} file${files.length !== 1 ? "s" : ""} · ${
            files.slice(0, 3).map((f) => f.split("/").pop()).join(", ")
          }${files.length > 3 ? "…" : ""}`
        );
        setTimeout(() => {
          completeStep("loading_files");
          activateStep("analyzing", selectedModel.split("/").pop() ?? selectedModel);

          // Cycle through file names
          if (files.length > 0) {
            let idx = 0;
            setScanningFile(files[idx]);
            const interval = setInterval(() => {
              idx = (idx + 1) % files.length;
              setScanningFile(files[idx]);
            }, 1400);
            // Clean up when analysis resolves
            analysisPromise.finally(() => clearInterval(interval));
          }
        }, 600);
      });

      try {
        const data = await analysisPromise;
        completeStep("analyzing");
        activateStep("compiling");
        await new Promise((r) => setTimeout(r, 250));
        completeStep("compiling", `${data.issues.length} issue${data.issues.length !== 1 ? "s" : ""} found`);
        await new Promise((r) => setTimeout(r, 300));
        setResult(data);
        if (data.total_changed_lines > 500) setShowLargePRWarning(true);
        saveToHistory(data);
        addToast({ type: "success", message: `Analysis complete — health score: ${data.health_score}/100` });
      } catch (err) {
        setProgressSteps((prev) => prev.map((s) => s.status === "active" ? { ...s, status: "pending" } : s));
        const message = err instanceof Error ? err.message : "Analysis failed. Please try again.";
        setError(message);
        addToast({ type: "error", message });
      }
    },
    [addToast, activateStep, completeStep, setScanningFile]
  );

  const handleAnalyze = useCallback(
    (prUrl: string, strictMode: boolean, selectedModel: string) => runAnalysis(prUrl, strictMode, selectedModel),
    [runAnalysis]
  );

  const handleHarsher = useCallback(() => {
    if (url) {
      setHasUsedStrictMode(true);
      runAnalysis(url, true, result?.model_used || "deepseek-ai/deepseek-v3.2");
    }
  }, [url, result?.model_used, runAnalysis]);

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
    setProgressSteps((prev) => prev.map((s) => ({ ...s, status: "done" as const })));
    setError(null);
  }, []);

  const isLoading = progressSteps.some((s) => s.status === "active");
  const hasResult = result !== null;

  return (
    <div className="min-h-screen bg-midnight-base flex flex-col relative overflow-hidden font-sans">
      {/* Ambient Glassmorphic Background Glows */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-amber-500/10 rounded-full blur-[140px] pointer-events-none -translate-y-1/3 translate-x-1/3" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-teal-500/5 rounded-full blur-[140px] pointer-events-none translate-y-1/3 -translate-x-1/3" />

      {/* Floating Pill Header */}
      <div className="w-full pt-6 px-6 relative z-40">
        <header className="max-w-5xl mx-auto rounded-full bg-midnight-card/40 backdrop-blur-xl border border-white/5 px-6 py-3 flex items-center justify-between shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
          <div className="flex items-center gap-3 group cursor-pointer">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-orange-600 p-[1px] shadow-lg shadow-amber-500/20 group-hover:shadow-amber-500/40 transition-shadow">
              <div className="w-full h-full bg-midnight-base/90 rounded-[10px] flex items-center justify-center">
                <span className="text-transparent bg-clip-text bg-gradient-to-br from-amber-300 to-orange-500 text-[11px] font-black tracking-widest">PR</span>
              </div>
            </div>
            <span className="text-sm font-bold text-white tracking-widest uppercase">PR Reviewer</span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white transition-colors"
            >
              <Github className="w-5 h-5" />
            </a>
          </div>
        </header>
      </div>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-12 lg:py-24 relative z-10 flex flex-col justify-center">
        
        {/* LANDING STATE - Split Layout */}
        {!hasResult && !isLoading && (
          <div className="grid lg:grid-cols-[1fr_1.15fr] gap-12 lg:gap-16 items-center animate-fade-in">
            {/* Left Column: Typography */}
            <div className="text-left space-y-8">
              <h1 className="text-5xl sm:text-[5.5rem] font-black text-white leading-[1.05] tracking-tighter">
                Your senior engineer
                <br />
                <span className="text-gray-500">is busy.</span>
                <br />
                <span className="relative inline-block mt-2">
                  <span className="absolute inset-x-0 bottom-0 h-1/2 bg-amber-500/20 blur-2xl rounded-full" />
                  <span className="relative bg-gradient-to-br from-amber-200 via-amber-400 to-orange-500 bg-clip-text text-transparent">
                    We&apos;re not.
                  </span>
                </span>
              </h1>
              <p className="text-gray-400 text-lg sm:text-xl max-w-lg leading-relaxed font-medium">
                Instant code review. No queue. No calendar invite.
              </p>
              
              <div className="pt-6 flex flex-col gap-4 text-sm font-medium text-gray-400">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-teal-500/10 flex items-center justify-center border border-teal-500/20">
                    <Check className="w-4 h-4 text-teal-400" />
                  </div>
                  <span>Deep AST Analysis across 40+ languages</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                    <Zap className="w-4 h-4 text-amber-400" />
                  </div>
                  <span>Sub-30s inference via Qwen2.5-Coder-32B</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
                    <Github className="w-4 h-4 text-orange-400" />
                  </div>
                  <span>One-click GitHub comment deployment</span>
                </div>
              </div>
            </div>

            {/* Right Column: Terminal/Input Card */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/20 to-transparent rounded-3xl blur-2xl" />
              <div className="relative bg-midnight-card/60 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-[0_16px_64px_rgba(0,0,0,0.5)]">
                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-400" /> Start Analysis
                </h3>
                <LandingInput
                  onAnalyze={handleAnalyze}
                  isLoading={isLoading}
                  hasResult={hasResult}
                  onHarsher={handleHarsher}
                  hasUsedStrictMode={hasUsedStrictMode}
                />
                
                <div className="mt-8 border-t border-white/5 pt-6">
                  <HistoryStrip onSelect={handleSelectHistory} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Compact input top bar when loading or showing result */}
        {(hasResult || isLoading) && (
          <div className="mb-10 max-w-3xl mx-auto w-full animate-fade-in relative z-20">
            <LandingInput
              onAnalyze={handleAnalyze}
              isLoading={isLoading}
              hasResult={hasResult}
              onHarsher={handleHarsher}
              hasUsedStrictMode={hasUsedStrictMode}
            />
          </div>
        )}

        {/* System Messages (Warnings/Errors) */}
        <div className="max-w-5xl mx-auto w-full">
          {showLargePRWarning && (
            <div className="mb-6 bg-amber-900/40 border border-amber-500/30 rounded-2xl animate-fade-in overflow-hidden backdrop-blur-md">
              <div className="flex items-center gap-3 px-5 py-4">
                <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
                <p className="text-sm font-medium text-amber-100">
                  Large PR ({result?.total_changed_lines}+ lines). Consider splitting for easier review.
                </p>
                <button
                  onClick={() => setShowSplitTips((v) => !v)}
                  className="ml-auto text-xs font-bold text-amber-400 hover:text-amber-200 uppercase tracking-wider flex-shrink-0"
                >
                  {showSplitTips ? "Hide tips" : "How to split?"}
                </button>
                <button
                  onClick={() => setShowLargePRWarning(false)}
                  className="text-amber-500 hover:text-amber-300 flex-shrink-0 ml-2"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              {showSplitTips && (
                <div className="px-5 pb-5 border-t border-amber-800/50 pt-4 bg-black/20">
                  <ul className="space-y-3 text-sm text-amber-200/80">
                    {[
                      ["Refactor first, feature second", "One PR restructures, a second adds the feature on top."],
                      ["Split by layer", "Backend (DB, API) in one PR, frontend in another."],
                      ["Tests separate", "Merge implementation first, follow up with tests."],
                      ["Stacked PRs", "Target dependent PRs sequentially. Use Graphite or ghstack."],
                    ].map(([title, desc], i) => (
                      <li key={i} className="flex gap-3">
                        <span className="text-amber-500 flex-shrink-0 font-bold">{i + 1}.</span>
                        <span><strong className="text-amber-300">{title}</strong> — {desc}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {error && !isLoading && (
            <div className="mb-6 p-5 bg-red-900/40 border border-red-500/30 rounded-2xl animate-fade-in backdrop-blur-md">
              <div className="flex items-start gap-4">
                <X className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-bold text-red-200 mb-1">Analysis failed</p>
                  <p className="text-sm text-red-200/70">{error}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="max-w-5xl mx-auto w-full relative z-10 pt-4">
            <ProgressFeed steps={progressSteps} />
          </div>
        )}

        {/* RESULTS - Bento Box Layout */}
        {hasResult && result && !isLoading && (
          <div className="space-y-6 max-w-5xl mx-auto w-full relative z-10">
            {/* Top row: Health & Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Health Score Bento */}
              <div 
                className="bg-midnight-card/60 backdrop-blur-2xl border border-white/5 rounded-3xl p-8 flex flex-col items-center justify-center shadow-xl animate-slide-up"
                style={{ animationFillMode: 'both', animationDelay: '0ms' }}
              >
                <h3 className="text-xs font-bold text-gray-400 tracking-widest uppercase mb-6 w-full text-center">System Health</h3>
                <HealthScore score={result.health_score} />
              </div>

              {/* Summary Bento */}
              <div 
                className="md:col-span-2 bg-midnight-card/60 backdrop-blur-2xl border border-white/5 rounded-3xl shadow-xl flex flex-col overflow-hidden animate-slide-up"
                style={{ animationFillMode: 'both', animationDelay: '100ms' }}
              >
                <SummaryCard result={result} />
              </div>
            </div>

            {/* Issues + Code Review (unified) */}
            {result.raw_diff && (
               <div 
                 className="bg-midnight-card/60 backdrop-blur-2xl border border-white/5 rounded-3xl shadow-xl p-2 sm:p-4 animate-slide-up"
                 style={{ animationFillMode: 'both', animationDelay: '200ms' }}
               >
                  <InlineDiffReview
                    rawDiff={result.raw_diff}
                    issues={result.issues}
                    prUrl={result.pr_url}
                    headSha={result.head_sha || ""}
                  />
               </div>
            )}
            
            <div 
              className="flex justify-center pt-8 pb-12 animate-slide-up"
              style={{ animationFillMode: 'both', animationDelay: '400ms' }}
            >
              <button
                onClick={handlePostComment}
                disabled={isPostingComment}
                className="flex items-center gap-3 px-8 py-4 rounded-full font-bold text-sm bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:border-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xl hover:shadow-2xl active:scale-95"
              >
                <Github className="w-5 h-5" />
                {isPostingComment ? "Posting to GitHub…" : "Post review to GitHub"}
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
            className={`flex items-center gap-3 px-5 py-4 rounded-2xl border shadow-2xl max-w-sm toast-enter backdrop-blur-md ${
              toast.type === "success"
                ? "bg-teal-900/40 border-teal-500/30 text-teal-100"
                : toast.type === "error"
                ? "bg-red-900/40 border-red-500/30 text-red-100"
                : "bg-midnight-card/80 border-white/10 text-gray-200"
            }`}
          >
            {toast.type === "success" && <Check className="w-5 h-5 text-teal-400 flex-shrink-0" />}
            {toast.type === "error" && <X className="w-5 h-5 text-red-400 flex-shrink-0" />}
            <p className="text-sm font-medium flex-1">{toast.message}</p>
            {toast.link && (
              <a
                href={toast.link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs font-bold underline opacity-70 hover:opacity-100 flex-shrink-0"
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
    </div>
  );
}
