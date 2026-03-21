"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, GitPullRequest, Filter, Brain } from "lucide-react";
import { LoadingStep } from "@/types";

interface LoadingStepsProps {
  currentStep: LoadingStep;
}

const steps: { key: LoadingStep; label: string; sublabel: string; icon: React.ElementType }[] = [
  { key: "fetching", label: "Fetching diff", sublabel: "Connecting to GitHub API", icon: GitPullRequest },
  { key: "filtering", label: "Filtering lines", sublabel: "Processing changed code", icon: Filter },
  { key: "analyzing", label: "Consulting AI", sublabel: "Agent is reviewing your code", icon: Brain },
];

const stepOrder: LoadingStep[] = ["idle", "fetching", "filtering", "analyzing", "done"];

export default function LoadingSteps({ currentStep }: LoadingStepsProps) {
  const [, setVisibleSteps] = useState<number>(0);

  useEffect(() => {
    const currentIndex = stepOrder.indexOf(currentStep);
    setVisibleSteps(currentIndex);
  }, [currentStep]);

  const getStepStatus = (stepKey: LoadingStep): "pending" | "active" | "done" => {
    const stepIdx = stepOrder.indexOf(stepKey);
    const currentIdx = stepOrder.indexOf(currentStep);
    if (currentIdx > stepIdx) return "done";
    if (currentIdx === stepIdx) return "active";
    return "pending";
  };

  return (
    <div className="flex flex-col items-center gap-8 py-12">
      <div className="text-center animate-fade-in">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-50 border border-purple-200 mb-4">
          <div className="w-2 h-2 rounded-full bg-purple-500 pulse-dot" />
          <span className="text-sm text-purple-700 font-medium">Analysis in progress</span>
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Reviewing your PR</h2>
        <p className="text-gray-500 mt-2 text-sm">This usually takes 15–30 seconds</p>
      </div>

      <div className="flex flex-col gap-4 w-full max-w-sm">
        {steps.map((step, index) => {
          const status = getStepStatus(step.key);
          const Icon = step.icon;

          return (
            <div
              key={step.key}
              className={`flex items-center gap-4 p-4 rounded-xl border transition-all duration-500 ${
                status === "active"
                  ? "border-purple-200 bg-purple-50"
                  : status === "done"
                  ? "border-green-200 bg-green-50"
                  : "border-gray-100 bg-gray-50 opacity-40"
              }`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div
                className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                  status === "done"
                    ? "bg-green-100 text-green-600"
                    : status === "active"
                    ? "bg-purple-100 text-purple-600"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                {status === "done" ? (
                  <Check className="w-5 h-5" />
                ) : status === "active" ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Icon className="w-5 h-5" />
                )}
              </div>

              <div className="flex-1">
                <div
                  className={`font-semibold text-sm ${
                    status === "done"
                      ? "text-green-700"
                      : status === "active"
                      ? "text-purple-700"
                      : "text-gray-400"
                  }`}
                >
                  {step.label}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">{step.sublabel}</div>
              </div>

              {status === "active" && (
                <div className="flex gap-1">
                  {[0, 1, 2].map((dot) => (
                    <div
                      key={dot}
                      className="w-1.5 h-1.5 rounded-full bg-purple-400"
                      style={{
                        animation: "pulseDot 1.5s ease-in-out infinite",
                        animationDelay: `${dot * 0.2}s`,
                      }}
                    />
                  ))}
                </div>
              )}

              {status === "done" && (
                <div className="text-xs text-green-600 font-medium">Done</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Animated bars */}
      <div className="flex gap-1.5 mt-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="w-1.5 rounded-full bg-purple-200"
            style={{
              height: `${16 + Math.sin(i * 0.8) * 12}px`,
              animation: "pulseDot 1.5s ease-in-out infinite",
              animationDelay: `${i * 0.1}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
