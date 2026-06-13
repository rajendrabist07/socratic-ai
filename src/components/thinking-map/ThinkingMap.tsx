"use client";

import { useMemo, useState } from "react";
import type { ThinkingMapData } from "@/server/ai/analysis";

interface ThinkingMapProps {
  data: ThinkingMapData;
}

type TimelinePoint = {
  score: number;
  x: number;
  y: number;
};

export function ThinkingMap({ data }: ThinkingMapProps) {
  const [shareState, setShareState] = useState<"idle" | "copied" | "failed">(
    "idle",
  );
  const timeline = useMemo(
    () => buildTimelinePoints(data.scoreTimeline),
    [data.scoreTimeline],
  );
  const polylinePoints = timeline
    .map((point) => `${point.x},${point.y}`)
    .join(" ");

  async function handleShare() {
    const url = typeof window === "undefined" ? "" : window.location.href;

    try {
      await navigator.clipboard.writeText(url);
      setShareState("copied");
    } catch {
      setShareState("failed");
    }
  }

  return (
    <section className="w-full space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-950">
            Thinking Map
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Comprehension path across the session
          </p>
        </div>

        <button
          type="button"
          onClick={handleShare}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
        >
          <span aria-hidden="true">URL</span>
          {shareState === "copied"
            ? "Copied"
            : shareState === "failed"
              ? "Copy failed"
              : "Share"}
        </button>
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 sm:p-4">
        <div className="mb-3 flex items-center justify-between text-xs font-medium text-slate-500">
          <span>Score timeline</span>
          <span>0-100</span>
        </div>

        {timeline.length > 0 ? (
          <div className="overflow-x-auto">
            <svg
              viewBox="0 0 100 100"
              role="img"
              aria-label="Comprehension score timeline"
              className="h-44 min-w-[320px] overflow-visible sm:h-52"
              preserveAspectRatio="none"
            >
              <line
                x1="6"
                y1="10"
                x2="6"
                y2="90"
                className="stroke-slate-300"
                strokeWidth="0.7"
              />
              <line
                x1="6"
                y1="90"
                x2="94"
                y2="90"
                className="stroke-slate-300"
                strokeWidth="0.7"
              />
              {[25, 50, 75].map((score) => {
                const y = scoreToY(score);

                return (
                  <line
                    key={score}
                    x1="6"
                    y1={y}
                    x2="94"
                    y2={y}
                    className="stroke-slate-200"
                    strokeWidth="0.5"
                    strokeDasharray="2 2"
                  />
                );
              })}
              {timeline.length > 1 ? (
                <polyline
                  points={polylinePoints}
                  fill="none"
                  className="stroke-slate-700"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
              ) : null}
              {timeline.map((point, index) => (
                <circle
                  key={`${point.score}-${index}`}
                  cx={point.x}
                  cy={point.y}
                  r="2.6"
                  className="fill-white stroke-slate-700"
                  strokeWidth="1.3"
                  vectorEffect="non-scaling-stroke"
                >
                  <title>{`Message ${index + 1}: ${point.score}/100`}</title>
                </circle>
              ))}
            </svg>
          </div>
        ) : (
          <div className="flex h-36 items-center justify-center rounded-md border border-dashed border-slate-300 text-sm text-slate-500">
            No comprehension scores yet
          </div>
        )}

        <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
          <span className="h-2.5 w-2.5 rounded-full border border-slate-700 bg-white" />
          Student message score
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.8fr)]">
        <div className="rounded-lg border border-slate-200 p-4">
          <h3 className="text-sm font-semibold text-slate-900">
            Misconceptions
          </h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {data.misconceptions.length > 0 ? (
              data.misconceptions.map((misconception) => (
                <span
                  key={misconception}
                  className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-900"
                >
                  <span
                    aria-hidden="true"
                    className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-amber-200 text-[10px] font-bold text-amber-900"
                  >
                    !
                  </span>
                  <span className="truncate">{misconception}</span>
                </span>
              ))
            ) : (
              <span className="text-sm text-slate-500">
                No clear misconceptions detected
              </span>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <h3 className="text-sm font-semibold text-emerald-950">
            Key Insight
          </h3>
          <p className="mt-2 text-sm leading-6 text-emerald-950">
            {data.keyInsight}
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 p-4">
        <h3 className="text-sm font-semibold text-slate-900">Summary</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">{data.summary}</p>
      </div>
    </section>
  );
}

function buildTimelinePoints(scores: number[]): TimelinePoint[] {
  if (scores.length === 0) {
    return [];
  }

  return scores.map((rawScore, index) => {
    const score = clampScore(rawScore);
    const x = scores.length === 1 ? 50 : 6 + (index / (scores.length - 1)) * 88;

    return {
      score,
      x,
      y: scoreToY(score),
    };
  });
}

function scoreToY(score: number): number {
  return 90 - clampScore(score) * 0.8;
}

function clampScore(score: number): number {
  return Math.min(100, Math.max(0, Math.round(score)));
}
