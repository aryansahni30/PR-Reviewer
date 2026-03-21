"use client";

import { useEffect, useState } from "react";

interface HealthScoreProps {
  score: number;
}

export default function HealthScore({ score }: HealthScoreProps) {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(timer);
  }, [score]);

  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const clampedScore = Math.max(0, Math.min(100, score));
  const offset = circumference - (clampedScore / 100) * circumference;

  let color: string;
  let label: string;
  let glowColor: string;
  if (clampedScore >= 71) {
    color = "#16a34a";
    glowColor = "rgba(22,163,74,0.18)";
    label = "Healthy";
  } else if (clampedScore >= 41) {
    color = "#d97706";
    glowColor = "rgba(217,119,6,0.18)";
    label = "Needs Attention";
  } else {
    color = "#dc2626";
    glowColor = "rgba(220,38,38,0.18)";
    label = "Critical Issues";
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: 140, height: 140 }}>
        <div
          className="absolute inset-0 rounded-full blur-xl opacity-50 transition-opacity duration-700"
          style={{ background: animated ? glowColor : "transparent" }}
        />
        <svg width="140" height="140" viewBox="0 0 140 140" className="relative z-10 -rotate-90">
          <circle cx="70" cy="70" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="10" />
          <circle
            cx="70"
            cy="70"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={animated ? offset : circumference}
            style={{
              transition: "stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)",
              filter: `drop-shadow(0 0 5px ${color}60)`,
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
          <span className="text-3xl font-bold tabular-nums" style={{ color }}>
            {animated ? clampedScore : 0}
          </span>
          <span className="text-xs text-gray-400 mt-0.5">/ 100</span>
        </div>
      </div>
      <div className="text-center">
        <div className="text-sm font-semibold" style={{ color }}>
          {label}
        </div>
        <div className="text-xs text-gray-400 mt-0.5">Health Score</div>
      </div>
    </div>
  );
}
