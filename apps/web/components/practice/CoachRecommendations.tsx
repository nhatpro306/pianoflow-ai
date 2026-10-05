'use client';

import React from 'react';
import { DrillRecommendation } from '@/lib/practice/analyticsEngine';
import { Button } from '@/components/ui/Button';

export interface CoachRecommendationsProps {
  drills: DrillRecommendation[];
  onApplyDrill: (drill: DrillRecommendation) => void;
  className?: string;
}

export function CoachRecommendations({
  drills,
  onApplyDrill,
  className = '',
}: CoachRecommendationsProps) {
  if (drills.length === 0) {
    return (
      <div className={`p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/80 text-center text-sm text-emerald-200 ${className}`}>
        <p className="font-semibold text-emerald-100">🎉 Flawless Run!</p>
        <p className="text-xs text-emerald-300/80 mt-1">
          No weak measure clusters detected. You are ready to increase song tempo or practice hands together at full speed!
        </p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
          Targeted Loop Drills ({drills.length})
        </h3>
        <span className="text-[11px] text-zinc-400">Clicking auto-configures A-B Loop & Tempo</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {drills.map((drill, idx) => {
          const isHighPriority = drill.priorityScore > 60 || drill.totalMisses >= 3;

          return (
            <div
              key={drill.id}
              className="flex flex-col justify-between p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-zinc-700 transition space-y-3 shadow-md"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-cyan-400 uppercase tracking-wide">
                    Drill #{idx + 1}: {drill.title}
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-tight ${
                      isHighPriority
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    {isHighPriority ? 'Priority: High' : 'Priority: Medium'}
                  </span>
                </div>

                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold text-zinc-200">
                    Accuracy: <strong className={drill.accuracy >= 70 ? 'text-amber-400' : 'text-rose-400'}>{drill.accuracy}%</strong>
                  </span>
                  <span className="text-zinc-600">•</span>
                  <span className="text-xs text-zinc-400">
                    {drill.totalMisses} {drill.totalMisses === 1 ? 'Miss' : 'Misses'}
                  </span>
                  {drill.prescribedHand !== 'both' && (
                    <>
                      <span className="text-zinc-600">•</span>
                      <span className={`text-[11px] font-bold ${
                        drill.prescribedHand === 'left' ? 'text-cyan-400' : 'text-purple-400'
                      }`}>
                        {drill.prescribedHand === 'left' ? 'LH Solo' : 'RH Solo'}
                      </span>
                    </>
                  )}
                </div>

                <p className="text-xs text-zinc-300 leading-relaxed bg-zinc-900/60 p-2 rounded-md border border-zinc-800/80">
                  {drill.diagnosis}
                </p>
              </div>

              <Button
                variant="primary"
                className="w-full text-xs py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-cyan-950/40"
                onClick={() => onApplyDrill(drill)}
              >
                <span>🎯 Drill This Section ({drill.recommendedSpeed}x Speed)</span>
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
