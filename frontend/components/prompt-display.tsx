"use client";

interface PromptDisplayProps {
  data: {
    prompt: string;
  };
}

export function PromptDisplay({ data }: PromptDisplayProps) {
  return (
    <div className="border-border bg-background h-full rounded-sm border">
      <div className="border-border bg-muted/50 border-b px-2 py-1">
        <span className="text-[10px] font-medium uppercase tracking-wider">
          Prompt
        </span>
      </div>
      <div className="p-2">
        <div className="font-mono text-xs">{data.prompt}</div>
      </div>
    </div>
  );
}
