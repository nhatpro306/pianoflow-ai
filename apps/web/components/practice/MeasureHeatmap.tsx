'use client';

import React, { useState } from 'react';
import { MeasureMetric } from '@/lib/practice/analyticsEngine';

export interface MeasureHeatmapProps {
  measures: MeasureMetric[];
  currentPlayheadMs?: number;
  onSelectMeasure?: (measure: MeasureMetric) => void;
  onDrillMeasure?: (measure: MeasureMetric) => void;
  className?: string;
}

export function MeasureHeatmap({
  measures,
  currentPlayheadMs,
  onSelectMeasure,
  onDrillMeasure,
  className = '',
}: MeasureHeatmapProps) {
  const [hoveredMeasure, setHoveredMeasure] = useState<MeasureMetric | null>(null);

  const getStatusColor = (status: MeasureMetric['status']) => {
    if (status === 'mastered') {
      return 'bg-emerald-600/80 hover:bg-emerald-500 border-emerald-400/40 text-emerald-100 shadow-emerald-950/20';
    }
    if (status === 'needs_polish') {
      return 'bg-amber-600/80 hover:bg-amber-500 border-amber-400/40 text-amber-100 shadow-amber-950/20';
    }
    return 'bg-rose-600/80 hover:bg-rose-500 border-rose-400/40 text-rose-100 shadow-rose-950/20';
  };

  if (!measures || measures.length === 0) {
    return (
      <div className={`p-4 rounded-xl bg-zinc-900 border border-zinc-800 text-center text-xs text-zinc-400 ${className}`}>
        No measure telemetry available for this run.
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-2.5 ${className}`}>
      {/* Legend & Header */}
      <div className="flex flex-wrap items-center justify-between text-xs text-zinc-400 gap-2">
        <span className="font-bold text-zinc-200 tracking-wide uppercase text-[11px]">
          Measure Accuracy Heatmap ({measures.length} Bars)
        </span>
        <div className="flex items-center gap-3 text-[11px]">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> ≥85% Mastered
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" /> 70–84% Polish
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-rose-500" /> &lt;70% Critical
          </span>
        </div>
      </div>

      {/* Horizontal Strip */}
      <div className="relative overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-zinc-700">
        <div className="flex items-stretch gap-1.5 min-w-max py-1">
          {measures.map((m) => {
            const isCurrent =
              currentPlayheadMs !== undefined &&
              currentPlayheadMs >= m.startMs &&
              currentPlayheadMs < m.endMs;

            return (
              <button
                key={m.measureNumber}
                type="button"
                onClick={() => onSelectMeasure?.(m)}
                onDoubleClick={() => onDrillMeasure?.(m)}
                onMouseEnter={() => setHoveredMeasure(m)}
                onMouseLeave={() => setHoveredMeasure(null)}
                aria-label={`Measure ${m.measureNumber}: ${m.accuracy}% accuracy, ${m.missHits} misses`}
                className={`relative flex flex-col items-center justify-between px-2 py-1.5 min-w-[48px] h-12 rounded-lg border text-[11px] font-mono font-bold transition-all shadow-sm ${getStatusColor(
                  m.status
                )} ${
                  isCurrent ? 'ring-2 ring-cyan-400 scale-105 z-10' : 'hover:scale-102'
                }`}
                title={`Bar ${m.measureNumber}: ${m.accuracy}% accuracy (${m.missHits} misses)`}
              >
                <span className="text-[10px] opacity-80 font-normal">#{m.measureNumber}</span>
                <span>{Math.round(m.accuracy)}%</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Hover / Selection Inspector */}
      {hoveredMeasure && (
        <div className="flex flex-wrap items-center justify-between px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs gap-3 animate-in fade-in duration-150">
          <div className="flex flex-wrap items-center gap-4">
            <span className="font-bold text-white text-sm">Bar {hoveredMeasure.measureNumber}</span>
            <span className="text-zinc-300">
              Accuracy:{' '}
              <strong
                className={
                  hoveredMeasure.accuracy >= 85
                    ? 'text-emerald-400'
                    : hoveredMeasure.accuracy >= 70
                    ? 'text-amber-400'
                    : 'text-rose-400'
                }
              >
                {hoveredMeasure.accuracy}%
              </strong>
            </span>
            <span className="text-zinc-400">
              Hits: <span className="text-emerald-400">{hoveredMeasure.perfectHits} Perfect</span> /{' '}
              <span className="text-amber-400">{hoveredMeasure.goodHits} Good</span> /{' '}
              <span className="text-rose-400">{hoveredMeasure.missHits} Miss</span>
            </span>
            <span className="text-zinc-400">
              Timing Bias:{' '}
              <span className="text-zinc-200 font-mono">
                {hoveredMeasure.meanBiasMs > 0
                  ? `+${hoveredMeasure.meanBiasMs}ms`
                  : `${hoveredMeasure.meanBiasMs}ms`}
              </span>
            </span>
            <span className="text-zinc-500 text-[11px]">
              Notes: {hoveredMeasure.expectedNotesCount} ({hoveredMeasure.notesPerSecond} nps)
            </span>
          </div>
          {onDrillMeasure && (
            <button
              type="button"
              onClick={() => onDrillMeasure(hoveredMeasure)}
              className="px-3 py-1 text-xs font-semibold rounded-md bg-cyan-600 hover:bg-cyan-500 text-white transition shadow-md"
            >
              Drill Bar #{hoveredMeasure.measureNumber}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
