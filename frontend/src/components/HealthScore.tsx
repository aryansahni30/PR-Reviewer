"use client";

import { useEffect, useState } from "react";

interface HealthScoreProps {
  score: number;
}

export default function HealthScore({ score }: HealthScoreProps) {
  const [animated, setAnimated] = useState(false);
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const duration = 1200;
    const target = Math.max(0, Math.min(100, score));

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 4);
      
      setCount(Math.floor(easeOut * target));

      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };

    const timer = setTimeout(() => {
      setAnimated(true);
      window.requestAnimationFrame(step);
    }, 100);

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
    color = "#06D6A0";
    glowColor = "rgba(6,214,160,0.25)";
    label = "Healthy";
  } else if (clampedScore >= 41) {
    color = "#FFC300";
    glowColor = "rgba(255,195,0,0.25)";
    label = "Needs Attention";
  } else {
    color = "#EF4444";
    glowColor = "rgba(239,68,68,0.25)";
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
          <circle cx="70" cy="70" r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
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
            {count}
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
