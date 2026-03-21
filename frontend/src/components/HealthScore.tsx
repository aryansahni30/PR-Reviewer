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
    color = "#22c55e";
    glowColor = "rgba(34,197,94,0.3)";
    label = "Healthy";
  } else if (clampedScore >= 41) {
    color = "#eab308";
    glowColor = "rgba(234,179,8,0.3)";
    label = "Needs Attention";
  } else {
    color = "#ef4444";
    glowColor = "rgba(239,68,68,0.3)";
    label = "Critical Issues";
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: 140, height: 140 }}>
        {/* Glow effect */}
        <div
          className="absolute inset-0 rounded-full blur-xl opacity-40 transition-opacity duration-700"
          style={{ background: animated ? glowColor : "transparent" }}
        />
        <svg width="140" height="140" viewBox="0 0 140 140" className="relative z-10 -rotate-90">
          {/* Background track */}
          <circle
            cx="70"
            cy="70"
            r={radius}
            fill="none"
            stroke="#1f2937"
            strokeWidth="10"
          />
          {/* Animated arc */}
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
              filter: `drop-shadow(0 0 6px ${color})`,
            }}
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
          <span
            className="text-3xl font-bold tabular-nums"
            style={{ color }}
          >
            {animated ? clampedScore : 0}
          </span>
          <span className="text-xs text-gray-400 mt-0.5">/ 100</span>
        </div>
      </div>
      <div className="text-center">
        <div className="text-sm font-semibold" style={{ color }}>
          {label}
        </div>
        <div className="text-xs text-gray-500 mt-0.5">Health Score</div>
      </div>
    </div>
  );
}
