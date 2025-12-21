"use client";

interface TokenExplanation {
  token: string;
  features: Array<{
    feature_idx: number;
    activation: number;
    explanation: string;
  }>;
}

interface TokenHeatmapProps {
  data: {
    prompt: string;
    full_text: string;
    input_token_explanations: TokenExplanation[];
    output_token_explanations: TokenExplanation[];
  };
}

export function TokenHeatmap({ data }: TokenHeatmapProps) {
  const allTokens = [
    ...data.input_token_explanations.map((t) => ({ ...t, type: "input" as const })),
    ...data.output_token_explanations.map((t) => ({ ...t, type: "output" as const })),
  ];

  const allFeatureIndices = new Set<number>();
  allTokens.forEach((token) => {
    token.features.forEach((f) => allFeatureIndices.add(f.feature_idx));
  });

  const features = Array.from(allFeatureIndices).sort((a, b) => a - b);

  const getActivation = (tokenIdx: number, featureIdx: number): number => {
    const token = allTokens[tokenIdx];
    const feature = token.features.find((f) => f.feature_idx === featureIdx);
    return feature ? feature.activation : 0;
  };

  const maxActivation = Math.max(
    ...allTokens.flatMap((t) => t.features.map((f) => f.activation))
  );

  const getHeatColor = (activation: number) => {
    if (activation === 0) return "bg-muted/20";
    const intensity = (activation / maxActivation) * 100;
    if (intensity > 80) return "bg-red-500";
    if (intensity > 60) return "bg-orange-500";
    if (intensity > 40) return "bg-yellow-500";
    if (intensity > 20) return "bg-blue-500";
    return "bg-primary/50";
  };

  const getOpacity = (activation: number) => {
    if (activation === 0) return 0.1;
    return Math.min((activation / maxActivation) * 0.9 + 0.1, 1);
  };

  return (
    <div className="border-border bg-background flex h-full flex-col rounded-sm border">
      <div className="border-border bg-muted/50 flex items-center justify-between border-b px-2 py-1">
        <span className="text-[10px] font-medium uppercase tracking-wider">
          Token Heatmap
        </span>
        <span className="text-muted-foreground text-[9px]">
          {allTokens.length} tokens × {features.length} features
        </span>
      </div>

      <div className="flex-1 overflow-auto p-2">
        <div className="inline-block min-w-full">
          <div className="flex gap-[1px]">
            <div className="flex flex-col gap-[1px] pr-1">
              <div className="h-8" />
              {features.map((featureIdx) => (
                <div
                  key={featureIdx}
                  className="text-muted-foreground flex h-6 items-center justify-end pr-1 text-[8px] font-medium"
                >
                  {featureIdx}
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-[1px]">
              <div className="flex gap-[1px]">
                {allTokens.map((token, idx) => (
                  <div
                    key={idx}
                    className={`flex h-8 w-12 items-end justify-center overflow-hidden border-b px-0.5 pb-0.5 ${
                      token.type === "input"
                        ? "border-primary/50"
                        : "border-orange-500/50"
                    }`}
                  >
                    <span
                      className="text-foreground truncate text-[8px] font-mono"
                      title={token.token}
                    >
                      {token.token.replace(/\s/g, "·")}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-[1px]">
                {features.map((featureIdx) => (
                  <div key={featureIdx} className="flex gap-[1px]">
                    {allTokens.map((_, tokenIdx) => {
                      const activation = getActivation(tokenIdx, featureIdx);
                      return (
                        <div
                          key={tokenIdx}
                          className={`h-6 w-12 rounded-sm ${getHeatColor(activation)}`}
                          style={{ opacity: getOpacity(activation) }}
                          title={`Token: ${allTokens[tokenIdx].token}\nFeature: ${featureIdx}\nActivation: ${activation.toFixed(2)}`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-border border-t bg-muted/30 px-2 py-1">
        <div className="flex items-center gap-2 text-[8px]">
          <div className="flex items-center gap-1">
            <div className="border-primary/50 h-2 w-6 border-b" />
            <span className="text-muted-foreground">Input</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-2 w-6 border-b border-orange-500/50" />
            <span className="text-muted-foreground">Output</span>
          </div>
        </div>
      </div>
    </div>
  );
}
