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
    <section className="w-full space-y-4 rounded-2xl border border-border bg-surface p-4 shadow-soft sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-500 mb-2">
            🎉 Session Completed
          </span>
          <h2 className="text-lg font-semibold text-foreground">
            Your Learning Breakdown
          </h2>
          <p className="mt-1 text-sm text-muted">
            Summary of your key insights, mastered concepts, and progress
          </p>
        </div>
        <button
          type="button"
          onClick={handleShare}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-full border border-border bg-surface-elevated px-4 text-sm font-medium text-foreground transition hover:border-accent/30 hover:bg-surface active:scale-95 focus:outline-none focus:ring-2 focus:ring-accent/50"
        >
          <span aria-hidden="true">🔗</span>
          {shareState === "copied"
            ? "Link Copied!"
            : shareState === "failed"
              ? "Copy failed"
              : "Share Summary"}
        </button>
      </div>

      <div className="rounded-2xl border border-border bg-background/70 p-3 sm:p-4">
        <div className="mb-3 flex items-center justify-between text-xs font-medium text-muted">
          <span>Understanding Progress</span>
          <span>Level (0-100)</span>
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
                className="stroke-muted/30"
                strokeWidth="0.7"
              />
              <line
                x1="6"
                y1="90"
                x2="94"
                y2="90"
                className="stroke-muted/30"
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
                    className="stroke-muted/20"
                    strokeWidth="0.5"
                    strokeDasharray="2 2"
                  />
                );
              })}
              {timeline.length > 1 ? (
                <polyline
                  points={polylinePoints}
                  fill="none"
                  className="stroke-accent"
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
                  className="fill-background stroke-accent"
                  strokeWidth="1.3"
                  vectorEffect="non-scaling-stroke"
                >
                  <title>{`Message ${index + 1}: ${point.score}/100`}</title>
                </circle>
              ))}
            </svg>
          </div>
        ) : (
          <div className="flex h-36 items-center justify-center rounded-2xl border border-dashed border-border text-sm text-muted">
            No comprehension scores yet
          </div>
        )}

        <div className="mt-3 flex items-center gap-2 text-xs text-muted">
          <span className="h-2.5 w-2.5 rounded-full border border-accent bg-background" />
          Student message score
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.8fr)]">
        <div className="rounded-2xl border border-border bg-background/50 p-4">
          <h3 className="text-sm font-semibold text-foreground">
            Misconceptions
          </h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {data.misconceptions.length > 0 ? (
              data.misconceptions.map((misconception) => (
                <span
                  key={misconception}
                  className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-xs font-medium text-amber-100"
                >
                  <span
                    aria-hidden="true"
                    className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-amber-300/20 text-[10px] font-bold text-amber-100"
                  >
                    !
                  </span>
                  <span className="truncate">{misconception}</span>
                </span>
              ))
            ) : (
              <span className="text-sm text-muted">
                No clear misconceptions detected
              </span>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-4">
          <h3 className="text-sm font-semibold text-emerald-100">
            Key Insight
          </h3>
          <p className="mt-2 text-sm leading-6 text-emerald-50/90">
            {data.keyInsight}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-background/50 p-4">
        <h3 className="text-sm font-semibold text-foreground">Summary</h3>
        <p className="mt-2 text-sm leading-6 text-muted">{data.summary}</p>
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
