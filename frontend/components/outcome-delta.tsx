"use client";

interface TokenExplanation {
  token: string;
  features: Array<{
    feature_idx: number;
    activation: number;
    explanation: string;
  }>;
}

interface OutcomeDeltaProps {
  data: {
    prompt: string;
    full_text: string;
    output_token_explanations: TokenExplanation[];
  };
}

export function OutcomeDelta({ data }: OutcomeDeltaProps) {
  const generatedText = data.full_text.slice(data.prompt.length);

  const topFeatures = data.output_token_explanations
    .flatMap((t) => t.features)
    .reduce((acc, f) => {
      const existing = acc.get(f.feature_idx);
      if (!existing || f.activation > existing.activation) {
        acc.set(f.feature_idx, f);
      }
      return acc;
    }, new Map<number, { feature_idx: number; activation: number; explanation: string }>());

  const sortedFeatures = Array.from(topFeatures.values())
    .sort((a, b) => b.activation - a.activation)
    .slice(0, 10);

  const maxActivation = Math.max(...sortedFeatures.map((f) => f.activation));

  return (
    <div className="border-border bg-background flex h-full flex-col rounded-sm border">
      <div className="border-border bg-muted/50 flex items-center justify-between border-b px-2 py-1">
        <span className="text-[10px] font-medium uppercase tracking-wider">
          Outcome Delta
        </span>
        <span className="text-muted-foreground text-[9px]">
          {data.output_token_explanations.length} tokens generated
        </span>
      </div>

      <div className="flex-1 overflow-auto p-2">
        <div className="space-y-3">
          <div className="border-border bg-muted/20 rounded-sm border p-2">
            <div className="text-muted-foreground mb-1 text-[9px] font-medium uppercase tracking-wider">
              Input Prompt
            </div>
            <div className="font-mono text-xs">{data.prompt}</div>
          </div>

          <div className="border-border bg-muted/20 rounded-sm border p-2">
            <div className="text-muted-foreground mb-1 text-[9px] font-medium uppercase tracking-wider">
              Generated Output
            </div>
            <div className="bg-primary/10 border-primary/20 rounded-sm border p-2 font-mono text-xs">
              {generatedText || "(empty)"}
            </div>
          </div>

          <div className="border-border bg-muted/20 rounded-sm border p-2">
            <div className="text-muted-foreground mb-2 text-[9px] font-medium uppercase tracking-wider">
              Full Text
            </div>
            <div className="font-mono text-xs">
              <span className="text-muted-foreground">{data.prompt}</span>
              <span className="text-primary font-semibold">{generatedText}</span>
            </div>
          </div>

          <div className="border-border bg-muted/20 rounded-sm border p-2">
            <div className="text-muted-foreground mb-2 text-[9px] font-medium uppercase tracking-wider">
              Top Contributing Features
            </div>
            <div className="space-y-1">
              {sortedFeatures.map((feature) => {
                const percentage = (feature.activation / maxActivation) * 100;
                return (
                  <div key={feature.feature_idx} className="space-y-0.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <div className="flex items-baseline gap-1">
                        <span className="text-foreground text-[9px] font-medium">
                          #{feature.feature_idx}
                        </span>
                        <span className="text-muted-foreground truncate text-[8px]">
                          {feature.explanation}
                        </span>
                      </div>
                      <span className="text-muted-foreground font-mono text-[8px]">
                        {feature.activation.toFixed(1)}
                      </span>
                    </div>
                    <div className="relative h-1 w-full rounded-sm bg-muted">
                      <div
                        className={`h-full rounded-sm transition-all ${
                          percentage > 80
                            ? "bg-red-500"
                            : percentage > 60
                              ? "bg-orange-500"
                              : percentage > 40
                                ? "bg-yellow-500"
                                : "bg-primary"
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="border-border bg-muted/20 rounded-sm border p-2">
            <div className="text-muted-foreground mb-2 text-[9px] font-medium uppercase tracking-wider">
              Token Breakdown
            </div>
            <div className="space-y-1">
              {data.output_token_explanations.map((token, idx) => (
                <div
                  key={idx}
                  className="border-border bg-muted/30 flex items-center gap-2 rounded-sm border p-1.5"
                >
                  <span className="text-foreground font-mono text-[9px] font-medium">
                    {token.token.replace(/\s/g, "·")}
                  </span>
                  <span className="text-muted-foreground text-[8px]">
                    {token.features.length} features
                  </span>
                  {token.features.length > 0 && (
                    <span className="text-muted-foreground text-[8px]">
                      (top: #{token.features[0].feature_idx})
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
