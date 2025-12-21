"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, SkipBack, SkipForward, ChevronsLeft } from "lucide-react";

interface TokenExplanation {
  token: string;
  features: Array<{
    feature_idx: number;
    activation: number;
    explanation: string;
  }>;
}

interface ReplayBarProps {
  data: {
    prompt: string;
    full_text: string;
    input_token_explanations: TokenExplanation[];
    output_token_explanations: TokenExplanation[];
  };
  currentStep: number;
  onStepChange: (step: number) => void;
}

export function ReplayBar({ data, currentStep, onStepChange }: ReplayBarProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  const allTokens = [
    ...data.input_token_explanations.map((t) => ({
      ...t,
      type: "input" as const,
    })),
    ...data.output_token_explanations.map((t) => ({
      ...t,
      type: "output" as const,
    })),
  ];

  const totalSteps = allTokens.length;

  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      onStepChange((currentStep + 1) % totalSteps);
    }, 1000 / speed);

    return () => clearInterval(interval);
  }, [isPlaying, currentStep, speed, totalSteps, onStepChange]);

  const handlePlayPause = () => {
    if (currentStep >= totalSteps - 1 && !isPlaying) {
      onStepChange(0);
    }
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setIsPlaying(false);
    onStepChange(0);
  };

  const handleStepForward = () => {
    setIsPlaying(false);
    onStepChange(Math.min(currentStep + 1, totalSteps - 1));
  };

  const handleStepBackward = () => {
    setIsPlaying(false);
    onStepChange(Math.max(currentStep - 1, 0));
  };

  const currentToken = allTokens[currentStep];
  const isOutputToken = currentToken?.type === "output";

  return (
    <div className="border-border bg-background border-b">
      <div className="flex items-center gap-4 p-3">
        {/* Playback Controls */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleReset}
            className="h-7 px-2"
          >
            <ChevronsLeft className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleStepBackward}
            disabled={currentStep === 0}
            className="h-7 px-2"
          >
            <SkipBack className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" onClick={handlePlayPause} className="h-7 px-3">
            {isPlaying ? (
              <Pause className="h-3.5 w-3.5" />
            ) : (
              <Play className="h-3.5 w-3.5" />
            )}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleStepForward}
            disabled={currentStep >= totalSteps - 1}
            className="h-7 px-2"
          >
            <SkipForward className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Speed Control */}
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs">Speed:</span>
          <div className="flex gap-1">
            {[0.5, 1, 2, 4].map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`rounded px-2 py-0.5 text-xs transition-colors ${
                  speed === s
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="flex-1">
          <div className="relative">
            <div className="bg-muted h-2 w-full rounded-full">
              <div
                className="bg-primary h-full rounded-full transition-all duration-200"
                style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
              />
            </div>
            <input
              type="range"
              min="0"
              max={totalSteps - 1}
              value={currentStep}
              onChange={(e) => {
                setIsPlaying(false);
                onStepChange(parseInt(e.target.value));
              }}
              className="absolute inset-0 w-full cursor-pointer opacity-0"
            />
          </div>
        </div>

        {/* Step Counter */}
        <div className="text-muted-foreground font-mono text-xs">
          {currentStep + 1} / {totalSteps}
        </div>
      </div>

      {/* Token Display */}
      <div className="border-border border-t bg-muted/20 px-3 py-2">
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <div className="text-muted-foreground mb-1 text-[9px] font-medium uppercase tracking-wider">
              Current Token
            </div>
            <div className="flex items-baseline gap-2">
              <span
                className={`rounded px-2 py-1 font-mono text-sm font-semibold ${
                  isOutputToken
                    ? "bg-orange-500/20 text-orange-600 dark:text-orange-400"
                    : "bg-primary/20 text-primary"
                }`}
              >
                {currentToken?.token.replace(/\s/g, "·") || "—"}
              </span>
              <span className="text-muted-foreground text-xs">
                ({isOutputToken ? "Generated" : "Input"})
              </span>
            </div>
          </div>

          <div className="flex-[2]">
            <div className="text-muted-foreground mb-1 text-[9px] font-medium uppercase tracking-wider">
              Top Features Activating
            </div>
            <div className="flex flex-wrap gap-1.5">
              {currentToken?.features.slice(0, 5).map((feature, idx) => (
                <div
                  key={feature.feature_idx}
                  className="animate-in fade-in zoom-in bg-muted flex items-center gap-1.5 rounded border border-border px-2 py-1"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <span className="text-foreground font-mono text-xs font-semibold">
                    #{feature.feature_idx}
                  </span>
                  <div className="bg-border h-3 w-px" />
                  <span className="text-muted-foreground max-w-[200px] truncate text-[10px]">
                    {feature.explanation}
                  </span>
                  <div className="bg-border h-3 w-px" />
                  <span className="text-primary font-mono text-xs font-semibold">
                    {feature.activation.toFixed(1)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Animated Pulse Indicator */}
      {isPlaying && (
        <div className="bg-primary absolute right-0 top-0 h-1 w-full animate-pulse" />
      )}
    </div>
  );
}
