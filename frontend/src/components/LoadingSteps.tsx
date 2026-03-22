"use client";

import { useEffect, useState } from "react";
import { Loader2, GitPullRequest, Filter, Brain, Check } from "lucide-react";
import { LoadingStep } from "@/types";

interface LoadingStepsProps {
  currentStep: LoadingStep;
}

const steps = [
  { key: "fetching", label: "Fetching Diff", icon: GitPullRequest },
  { key: "filtering", label: "Filtering Noise", icon: Filter },
  { key: "analyzing", label: "AI Analysis", icon: Brain },
];

export default function LoadingSteps({ currentStep }: LoadingStepsProps) {
  const getActiveIndex = () => {
    if (currentStep === "fetching") return 0;
    if (currentStep === "filtering") return 1;
    if (currentStep === "analyzing") return 2;
    if (currentStep === "done") return 3;
    return 0;
  };

  const activeIndex = getActiveIndex();

  return (
    <div className="w-full space-y-6 animate-fade-in">
      
      {/* Dynamic Status Header */}
      <div className="flex justify-center mb-8">
        <div className="flex items-center gap-2 px-6 py-3 rounded-full bg-midnight-card/80 border border-white/10 shadow-2xl backdrop-blur-xl">
          {steps.map((step, idx) => {
             const isActive = activeIndex === idx;
             const isPast = activeIndex > idx;
             const Icon = step.icon;
             
             return (
               <div key={step.key} className="flex items-center">
                 <div className={`flex items-center gap-2 ${isActive ? 'text-amber-400' : isPast ? 'text-teal-400' : 'text-gray-600'} transition-colors duration-500`}>
                   {isPast ? <Check className="w-4 h-4" /> : isActive ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icon className="w-4 h-4 opacity-50" />}
                   <span className={`text-sm font-bold uppercase tracking-wider ${isActive ? '' : 'hidden sm:block'}`}>
                     {step.label}
                   </span>
                 </div>
                 {idx < 2 && (
                   <div className="w-8 sm:w-12 h-[1px] bg-white/10 mx-3 sm:mx-4" />
                 )}
               </div>
             )
          })}
        </div>
      </div>

      {/* SKELETON BENTO GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
        {/* Skeleton Health Score */}
        <div className="bg-midnight-card/40 backdrop-blur-2xl border border-white/5 rounded-3xl p-8 flex flex-col items-center justify-center shadow-xl h-64">
           <div className="w-32 h-4 bg-white/5 rounded-full mb-8" />
           <div className="w-32 h-32 rounded-full border-8 border-white/5" />
        </div>

        {/* Skeleton Summary */}
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

      {/* Skeleton Issues Panel */}
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
