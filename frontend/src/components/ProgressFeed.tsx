"use client";

import { useEffect, useState } from "react";
import { Loader2, Check, Circle, GitPullRequest, FileCode, Brain, Sparkles, Wifi } from "lucide-react";
import { ProgressStep } from "@/types";
import { cn } from "@/lib/utils";

interface ProgressFeedProps {
  steps: ProgressStep[];
}

const stepIcons: Record<string, React.ElementType> = {
  connecting:    Wifi,
  fetching:      GitPullRequest,
  loading_files: FileCode,
  analyzing:     Brain,
  compiling:     Sparkles,
};

function ElapsedTimer({ startedAt }: { startedAt?: number }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!startedAt) return;
    const interval = setInterval(() => {
      setElapsed(Date.now() - startedAt);
    }, 100);
    return () => clearInterval(interval);
  }, [startedAt]);
  return (
    <span className="text-[11px] text-muted-foreground tabular-nums">
      {(elapsed / 1000).toFixed(1)}s…
    </span>
  );
}

function ScanningFileTicker({ file }: { file: string }) {
  const [visible, setVisible] = useState(true);

  // Fade out then back in whenever the file changes
  useEffect(() => {
    setVisible(false);
    const t = setTimeout(() => setVisible(true), 150);
    return () => clearTimeout(t);
  }, [file]);

  return (
    <span
      className={cn(
        "text-[11px] font-mono text-amber-400/70 transition-opacity duration-150",
        visible ? "opacity-100" : "opacity-0"
      )}
    >
      ↳ {file}
    </span>
  );
}

export default function ProgressFeed({ steps }: ProgressFeedProps) {
  const activeStep = steps.find((s) => s.status === "active");

  return (
    <div className="w-full space-y-6 animate-fade-in">
      {/* Feed card */}
      <div className="flex justify-center">
        <div className="w-full max-w-md bg-card/60 backdrop-blur-xl border border-border rounded-2xl px-6 py-5 shadow-2xl">

          {/* Title */}
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-5 text-center">
            {activeStep ? activeStep.label + "…" : "Analyzing your PR"}
          </p>

          <div className="space-y-0">
            {steps.map((step, idx) => {
              const Icon = stepIcons[step.id] ?? Circle;
              const isLast = idx === steps.length - 1;
              const isPending = step.status === "pending";
              const isActive  = step.status === "active";
              const isDone    = step.status === "done";

              return (
                <div key={step.id} className="flex gap-3">
                  {/* Icon + connector line */}
                  <div className="flex flex-col items-center">
                    <div
                      className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-500",
                        isDone    && "bg-teal-500/15 border border-teal-500/40",
                        isActive  && "bg-amber-500/15 border border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.2)]",
                        isPending && "bg-white/5 border border-white/10"
                      )}
                    >
                      {isDone && <Check className="w-3.5 h-3.5 text-teal-400" />}
                      {isActive && <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />}
                      {isPending && <Icon className="w-3.5 h-3.5 text-white/20" />}
                    </div>
                    {!isLast && (
                      <div
                        className={cn(
                          "w-px flex-1 my-1 min-h-[20px] transition-all duration-700",
                          isDone ? "bg-teal-500/30" : "bg-white/5"
                        )}
                      />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 pb-4 pt-0.5 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={cn(
                          "text-sm font-semibold transition-colors duration-300",
                          isDone    && "text-muted-foreground",
                          isActive  && "text-amber-300",
                          isPending && "text-white/25"
                        )}
                      >
                        {step.label}
                      </span>

                      {/* Time badge */}
                      {isDone && step.durationMs !== undefined && (
                        <span className="text-[11px] text-teal-500/70 font-mono flex-shrink-0">
                          {(step.durationMs / 1000).toFixed(1)}s
                        </span>
                      )}
                      {isActive && <ElapsedTimer startedAt={step.startedAt} />}
                    </div>

                    {/* Sub-detail */}
                    {(isDone || isActive) && step.detail && (
                      <p className={cn(
                        "text-[12px] mt-0.5 transition-colors",
                        isDone ? "text-muted-foreground/60" : "text-muted-foreground"
                      )}>
                        {step.detail}
                      </p>
                    )}

                    {/* Scanning file ticker (only on active analyzing step) */}
                    {isActive && step.scanningFile && (
                      <ScanningFileTicker file={step.scanningFile} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Skeleton cards below */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
        <div className="bg-midnight-card/40 backdrop-blur-2xl border border-white/5 rounded-3xl p-8 flex flex-col items-center justify-center shadow-xl h-64">
          <div className="w-32 h-4 bg-white/5 rounded-full mb-8" />
          <div className="w-32 h-32 rounded-full border-8 border-white/5" />
        </div>
        <div className="md:col-span-2 bg-midnight-card/40 backdrop-blur-2xl border border-white/5 rounded-3xl p-8 flex flex-col justify-center shadow-xl h-64">
          <div className="w-2/3 h-8 bg-white/10 rounded-xl mb-6" />
          <div className="flex gap-4 mb-8">
            <div className="w-24 h-4 bg-white/5 rounded-full" />
            <div className="w-32 h-4 bg-white/5 rounded-full" />
          </div>
          <div className="space-y-4">
            <div className="w-full h-3 bg-white/5 rounded-full" />
            <div className="w-5/6 h-3 bg-white/5 rounded-full" />
            <div className="w-4/6 h-3 bg-white/5 rounded-full" />
          </div>
        </div>
      </div>

      <div className="bg-midnight-card/40 backdrop-blur-2xl border border-white/5 rounded-3xl p-6 shadow-xl h-48 animate-pulse">
        <div className="flex justify-between items-center mb-6">
          <div className="w-32 h-6 bg-white/10 rounded-xl" />
          <div className="flex gap-2">
            <div className="w-16 h-8 bg-white/5 rounded-xl" />
            <div className="w-16 h-8 bg-white/5 rounded-xl" />
          </div>
        </div>
        <div className="w-full h-12 bg-white/5 rounded-2xl mb-3" />
        <div className="w-full h-12 bg-white/5 rounded-2xl" />
      </div>
    </div>
  );
}
