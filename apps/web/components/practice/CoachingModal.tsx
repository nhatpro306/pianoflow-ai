'use client';

import React from 'react';
import { Dialog, DialogActions } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import {
  SessionAnalyticsReport,
  DrillRecommendation,
  MeasureMetric,
} from '@/lib/practice/analyticsEngine';
import { MeasureHeatmap } from './MeasureHeatmap';
import { CoachRecommendations } from './CoachRecommendations';

export interface CoachingModalProps {
  open: boolean;
  onClose: () => void;
  report: SessionAnalyticsReport | null;
  xpGained: number;
  currentStreak: number;
  onApplyDrill: (drill: DrillRecommendation) => void;
  onSelectMeasure: (measure: MeasureMetric) => void;
  levelUp?: boolean;
  currentLevel?: number;
}

export function CoachingModal({
  open,
  onClose,
  report,
  xpGained,
  currentStreak,
  onApplyDrill,
  onSelectMeasure,
  levelUp = false,
  currentLevel,
}: CoachingModalProps) {
  if (!report) return null;

  const { timing, overallGrade, overallAccuracy, measures, drills, summaryMessage } = report;

  const getTimingColor = (cls: string) => {
    if (cls === 'pocket') return 'text-emerald-400';
    if (cls === 'rushing') return 'text-amber-400';
    return 'text-rose-400';
  };

  const getGradeBg = (grade: string) => {
    if (grade === 'S') return 'from-yellow-400 to-amber-600 shadow-amber-500/30';
    if (grade === 'A') return 'from-cyan-400 to-blue-600 shadow-cyan-500/30';
    if (grade === 'B') return 'from-emerald-400 to-teal-600 shadow-emerald-500/30';
    if (grade === 'C') return 'from-amber-400 to-orange-600 shadow-orange-500/30';
    return 'from-rose-500 to-red-700 shadow-rose-500/30';
  };

  // Clamp pin position between 5% and 95%
  // 0ms maps to 50%, -60ms maps to ~10%, +60ms maps to ~90%
  const pinPercent = Math.min(95, Math.max(5, 50 + (timing.globalMeanBiasMs / 60) * 40));

  const topDrill = drills.length > 0 ? drills[0] : null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="AI Coaching & Session Analytics"
      className="max-w-3xl sm:max-w-4xl"
    >
      <div className="py-2 space-y-5 max-h-[75vh] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-zinc-700">
        {/* Top Summary Banner */}
        <div className="flex flex-wrap items-center justify-between p-4 rounded-xl bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-800 gap-4 shadow-md">
          <div className="flex items-center gap-4">
            <div
              className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${getGradeBg(
                overallGrade
              )} flex items-center justify-center text-3xl font-black text-white shadow-xl ring-2 ring-white/10`}
            >
              {overallGrade}
            </div>
            <div>
              <div className="text-xl font-extrabold text-white flex items-center gap-2">
                <span>{overallAccuracy}% Accuracy</span>
                {levelUp && currentLevel && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 font-bold">
                    🎉 Level {currentLevel}!
                  </span>
                )}
              </div>
              <div className="text-xs text-zinc-300 mt-1 max-w-md leading-relaxed">{summaryMessage}</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-2xl font-black text-cyan-400">+{xpGained} XP</div>
              <div className="text-xs text-zinc-400 font-medium">🔥 {currentStreak} Day Streak</div>
            </div>
          </div>
        </div>

        {/* Pillar A: Rhythm Drift & Micro-Timing Analytics */}
        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
                Rhythm Drift & Micro-Timing Bias
              </h4>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Evaluates systematic anticipations (rushing) and hesitations (dragging)
              </p>
            </div>
            <span className={`text-xs font-bold uppercase px-2.5 py-1 rounded-md bg-zinc-950 border border-zinc-800 ${getTimingColor(timing.globalClassification)}`}>
              {timing.globalClassification === 'pocket'
                ? '🎯 Locked In The Pocket (±15ms)'
                : timing.globalClassification === 'rushing'
                ? '⚡ Systematically Rushing'
                : '⏳ Systematically Dragging'}
            </span>
          </div>

          {/* Bi-directional Timing Gauge */}
          <div className="relative pt-3 pb-2 px-1">
            <div className="flex justify-between text-[11px] font-mono text-zinc-400 mb-1.5 font-medium">
              <span className="text-amber-400">◄ Rushing (-60ms Early)</span>
              <span className="text-emerald-400 font-bold">Pocket (±15ms)</span>
              <span className="text-rose-400">Dragging (+60ms Late) ►</span>
            </div>

            {/* Scale Track */}
            <div className="h-3.5 rounded-full bg-zinc-950 border border-zinc-800 relative overflow-hidden flex shadow-inner">
              <div className="w-[35%] bg-amber-500/20 border-r border-zinc-800" />
              <div className="w-[30%] bg-emerald-500/25 border-r border-zinc-800" />
              <div className="w-[35%] bg-rose-500/20" />
            </div>

            {/* Zero Mark Indicator */}
            <div className="absolute top-7 left-1/2 -translate-x-1/2 w-0.5 h-3.5 bg-zinc-400/50 pointer-events-none" />

            {/* Playhead Pin */}
            <div
              className="absolute top-6 w-4 h-4 rounded-full bg-cyan-400 border-2 border-white shadow-[0_0_12px_rgba(34,211,238,0.9)] -translate-x-1/2 transition-all duration-300"
              style={{ left: `${pinPercent}%` }}
              title={`Mean Timing Bias: ${timing.globalMeanBiasMs > 0 ? `+${timing.globalMeanBiasMs}ms` : `${timing.globalMeanBiasMs}ms`}`}
            />

            {/* Legend Stats Below Gauge */}
            <div className="flex justify-between text-[11px] text-zinc-400 mt-2 font-mono">
              <span>
                Mean Bias: <strong className="text-white">{timing.globalMeanBiasMs > 0 ? `+${timing.globalMeanBiasMs}ms` : `${timing.globalMeanBiasMs}ms`}</strong>
              </span>
              <span>
                Stability / Jitter (σ): <strong className="text-white">±{timing.globalJitterMs}ms</strong>
              </span>
            </div>
          </div>

          {/* Decoupled Hand Breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
            <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800/80">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400 font-medium">Right Hand (Treble / Melody)</span>
                <span className={`text-[10px] font-bold uppercase ${getTimingColor(timing.rightHand.classification)}`}>
                  {timing.rightHand.classification}
                </span>
              </div>
              <div className="text-base font-bold text-white mt-1">
                {timing.rightHand.meanBiasMs > 0 ? `+${timing.rightHand.meanBiasMs}ms` : `${timing.rightHand.meanBiasMs}ms`}
                <span className="text-xs text-zinc-500 font-normal ml-2">
                  (Jitter: ±{timing.rightHand.jitterMs}ms • {timing.rightHand.noteCount} notes)
                </span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800/80">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400 font-medium">Left Hand (Bass / Harmony)</span>
                <span className={`text-[10px] font-bold uppercase ${getTimingColor(timing.leftHand.classification)}`}>
                  {timing.leftHand.classification}
                </span>
              </div>
              <div className="text-base font-bold text-white mt-1">
                {timing.leftHand.meanBiasMs > 0 ? `+${timing.leftHand.meanBiasMs}ms` : `${timing.leftHand.meanBiasMs}ms`}
                <span className="text-xs text-zinc-500 font-normal ml-2">
                  (Jitter: ±{timing.leftHand.jitterMs}ms • {timing.leftHand.noteCount} notes)
                </span>
              </div>
            </div>
          </div>

          {Math.abs(timing.handSyncGapMs) > 15 && (
            <div className="px-3 py-2 rounded-lg bg-amber-950/30 border border-amber-800/60 text-xs text-amber-200/90 flex items-center justify-between">
              <span>
                ⚠️ <strong>Hand Sync Disparity ({Math.abs(timing.handSyncGapMs)}ms gap):</strong>{' '}
                {timing.handSyncGapMs > 0
                  ? 'Right hand strikes slightly ahead of left hand accompaniment.'
                  : 'Left hand strikes ahead of melody line.'}
              </span>
            </div>
          )}
        </div>

        {/* Pillar B: Measure Difficulty Heatmap */}
        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 shadow-sm">
          <MeasureHeatmap
            measures={measures}
            onSelectMeasure={onSelectMeasure}
            onDrillMeasure={(m) => {
              onApplyDrill({
                id: `drill-${m.measureNumber}`,
                title: `Measure ${m.measureNumber}`,
                startMeasure: m.measureNumber,
                endMeasure: m.measureNumber,
                loopStartMs: m.startMs,
                loopEndMs: m.endMs,
                recommendedSpeed: 0.75,
                priorityScore: 50,
                diagnosis: `Focused drill of Bar ${m.measureNumber}.`,
                prescribedHand: 'both',
                totalMisses: m.missHits,
                accuracy: m.accuracy,
              });
            }}
          />
        </div>

        {/* Pillar C: AI Drill Recommendations */}
        <CoachRecommendations drills={drills} onApplyDrill={onApplyDrill} />
      </div>

      <DialogActions className="flex-wrap gap-2 pt-2">
        {topDrill && (
          <Button
            variant="primary"
            onClick={() => onApplyDrill(topDrill)}
            className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-zinc-950 font-bold"
          >
            🎯 Drill Weakest Section ({topDrill.title})
          </Button>
        )}
        <Button variant="secondary" onClick={onClose}>
          Keep Practicing Full Song
        </Button>
      </DialogActions>
    </Dialog>
  );
}
