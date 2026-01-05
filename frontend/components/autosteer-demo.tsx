"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || "";

// Types
interface Feature {
  feature_idx: number;
  activation: number;
  explanation: string;
}

interface TokenExplanation {
  token: string;
  features: Feature[];
}

interface GenerateResult {
  full_text: string;
  input_token_explanations: TokenExplanation[];
  output_token_explanations: TokenExplanation[];
}

interface SteeringResult {
  full_text: string;
  input_token_explanations: TokenExplanation[];
  output_token_explanations: TokenExplanation[];
}

interface SearchFeature {
  feature_idx: number;
  relevance_score: number;
  description: string;
}

interface ActiveFeature {
  feature_idx: number;
  description: string;
  strength: number;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  steered?: boolean;
  result?: { steering?: SteeringResult; generate?: GenerateResult };
}

interface ModalState {
  query: string;
  loading: boolean;
  results: SearchFeature[];
  browse: SearchFeature[];
  browseLoading: boolean;
}

// Icons
const Icons = {
  check: (
    <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
        clipRule="evenodd"
      />
    </svg>
  ),
  plus: (
    <svg
      className="h-3 w-3"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 4v16m8-8H4"
      />
    </svg>
  ),
  close: (className: string) => (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  ),
};

const Spinner = ({ className = "h-3 w-3" }: { className?: string }) => (
  <div
    className={cn(
      "animate-spin rounded-full border-2 border-muted border-t-primary",
      className,
    )}
  />
);

// Components
function AddButton({
  added,
  onClick,
}: {
  added: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={added}
      className={cn(
        "flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors",
        added
          ? "border-primary bg-primary text-primary-foreground"
          : "border-muted-foreground/30 hover:border-primary hover:bg-primary/10",
      )}
    >
      {added ? Icons.check : Icons.plus}
    </button>
  );
}

function FeatureCard({
  feature,
  onRemove,
  onStrength,
}: {
  feature: ActiveFeature;
  onRemove: () => void;
  onStrength: (s: number) => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
      <div className="min-w-0 flex-1">
        <span className="font-mono text-[10px] text-primary">
          #{feature.feature_idx}
        </span>
        <p className="truncate text-[11px] text-muted-foreground">
          {feature.description}
        </p>
      </div>
      <input
        type="range"
        min="0"
        max="10"
        step="0.1"
        value={feature.strength}
        onChange={(e) => onStrength(parseFloat(e.target.value))}
        className="h-1 w-14 cursor-pointer appearance-none rounded-full bg-muted accent-primary"
      />
      <span className="w-10 text-right font-mono text-[10px] text-primary">
        {feature.strength.toFixed(1)}x
      </span>
      <button
        onClick={onRemove}
        className="rounded p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
      >
        {Icons.close("h-3 w-3")}
      </button>
    </div>
  );
}

// Main
export function AutoSteerDemo() {
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [selection, setSelection] = React.useState<{
    msgId: string;
    tokenIdx: number | null;
  } | null>(null);
  const [modal, setModal] = React.useState<ModalState | null>(null);
  const [activeFeatures, setActiveFeatures] = React.useState<ActiveFeature[]>(
    [],
  );

  const chatEndRef = React.useRef<HTMLDivElement>(null);
  const searchTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  // Derived
  const activeMsg = selection
    ? messages.find((m) => m.id === selection.msgId)
    : null;
  const result = activeMsg?.result;
  const tokenSource = result?.steering || result?.generate;
  const allTokens = tokenSource
    ? [
        ...(tokenSource.input_token_explanations || []).map((t) => ({
          ...t,
          isOutput: false,
        })),
        ...(tokenSource.output_token_explanations || []).map((t) => ({
          ...t,
          isOutput: true,
        })),
      ]
    : [];
  const selectedToken =
    selection?.tokenIdx != null ? allTokens[selection.tokenIdx] : null;
  const maxAct = Math.max(
    ...allTokens.flatMap((t) => t.features?.map((f) => f.activation) || []),
    1,
  );

  React.useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Feature helpers
  const addFeature = (idx: number, desc: string) => {
    if (!activeFeatures.some((f) => f.feature_idx === idx)) {
      setActiveFeatures((p) => [
        ...p,
        { feature_idx: idx, description: desc, strength: 1.0 },
      ]);
    }
  };
  const removeFeature = (idx: number) =>
    setActiveFeatures((p) => p.filter((f) => f.feature_idx !== idx));
  const setStrength = (idx: number, s: number) =>
    setActiveFeatures((p) =>
      p.map((f) => (f.feature_idx === idx ? { ...f, strength: s } : f)),
    );
  const hasFeature = (idx: number) =>
    activeFeatures.some((f) => f.feature_idx === idx);

  // Modal
  const openModal = async () => {
    setModal({
      query: "",
      loading: false,
      results: [],
      browse: [],
      browseLoading: true,
    });
    try {
      const res = await fetch(`${SERVER_URL}/random_features?count=25`);
      if (res.ok) {
        const data = await res.json();
        setModal(
          (m) =>
            m && { ...m, browse: data.features || [], browseLoading: false },
        );
      }
    } catch {
      setModal((m) => m && { ...m, browseLoading: false });
    }
  };

  const closeModal = () => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    setModal(null);
  };

  const onSearch = (q: string) => {
    setModal((m) => m && { ...m, query: q });
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!q.trim()) {
      setModal((m) => m && { ...m, results: [], loading: false });
      return;
    }
    searchTimeout.current = setTimeout(async () => {
      setModal((m) => m && { ...m, loading: true });
      try {
        const res = await fetch(
          `${SERVER_URL}/search_features?query=${encodeURIComponent(q)}&top_k=10`,
        );
        if (res.ok) {
          const data = await res.json();
          setModal(
            (m) => m && { ...m, results: data.features || [], loading: false },
          );
        }
      } catch {
        setModal((m) => m && { ...m, loading: false });
      }
    }, 500);
  };

  // Send
  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      steered: activeFeatures.length > 0,
    };
    setMessages((p) => [...p, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const hasSteering = activeFeatures.length > 0;

      // Build requests
      const steerReq = hasSteering
        ? {
            prompt: input,
            steering_configs: activeFeatures.map((f) => ({
              steering_feature: f.feature_idx,
              max_act: 30.0,
              steering_strength: f.strength,
            })),
            max_new_tokens: 100,
          }
        : null;

      const genReq = { prompt: input, max_new_tokens: 100, top_k: 5 };

      console.log("[API] Steer request:", steerReq);
      console.log("[API] Generate request:", genReq);

      const [steerRes, genRes] = await Promise.all([
        steerReq
          ? fetch(`${SERVER_URL}/steer`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(steerReq),
            })
          : null,
        fetch(`${SERVER_URL}/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(genReq),
        }),
      ]);

      if (!genRes.ok) throw new Error(`Generate failed: ${genRes.status}`);

      const genData: GenerateResult = await genRes.json();
      const steerData: SteeringResult | null = steerRes?.ok
        ? await steerRes.json()
        : null;

      console.log("[API] Generate response:", genData);
      console.log("[API] Steer response:", steerData);
      console.log(
        "[API] Steer output_token_explanations:",
        steerData?.output_token_explanations?.length,
        steerData?.output_token_explanations?.[0],
      );

      const asstId = (Date.now() + 1).toString();
      setMessages((p) => [
        ...p,
        {
          id: asstId,
          role: "assistant",
          content: steerData?.full_text || genData.full_text,
          result: { generate: genData, steering: steerData || undefined },
        },
      ]);
      setSelection({ msgId: asstId, tokenIdx: null });
    } catch (err) {
      setMessages((p) => [
        ...p,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: `Error: ${err instanceof Error ? err.message : "Failed"}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-8">
          <div className="flex h-full max-h-[800px] w-full max-w-4xl flex-col rounded-xl border border-border bg-background shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold">Tune Steering</h2>
                <p className="text-[13px] text-muted-foreground">
                  Select features to steer generation
                </p>
              </div>
              <button
                onClick={closeModal}
                className="rounded-lg p-2 text-muted-foreground hover:bg-muted"
              >
                {Icons.close("h-5 w-5")}
              </button>
            </div>

            <div className="flex flex-1 overflow-hidden">
              <div className="flex w-1/2 flex-col border-r border-border p-6 gap-4">
                <div>
                  <label className="mb-2 block text-[11px] font-medium text-muted-foreground">
                    Search Features
                  </label>
                  <textarea
                    value={modal.query}
                    onChange={(e) => onSearch(e.target.value)}
                    placeholder="Describe how to steer..."
                    rows={3}
                    className="w-full resize-none rounded-lg border border-border bg-card px-4 py-3 text-[14px] placeholder-muted-foreground/50 focus:border-primary focus:outline-none"
                  />
                </div>
                <div className="flex min-h-0 flex-1 flex-col">
                  <label className="mb-2 block text-[11px] font-medium text-muted-foreground">
                    Browse
                  </label>
                  {modal.browseLoading ? (
                    <div className="flex items-center gap-2 py-3 text-[13px] text-muted-foreground">
                      <Spinner /> Loading...
                    </div>
                  ) : (
                    <div className="flex-1 space-y-2 overflow-auto rounded-lg border border-border bg-card p-2">
                      {modal.browse.map((f) => (
                        <div
                          key={f.feature_idx}
                          className={cn(
                            "flex items-start gap-2 rounded-md p-2 text-[12px]",
                            hasFeature(f.feature_idx)
                              ? "bg-primary/10"
                              : "hover:bg-muted",
                          )}
                        >
                          <AddButton
                            added={hasFeature(f.feature_idx)}
                            onClick={() =>
                              addFeature(f.feature_idx, f.description)
                            }
                          />
                          <div className="min-w-0 flex-1">
                            <span className="font-mono text-[10px] text-primary">
                              #{f.feature_idx}
                            </span>
                            <p className="line-clamp-2 text-muted-foreground">
                              {f.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex w-1/2 flex-col">
                {activeFeatures.length > 0 && (
                  <div className="border-b border-border">
                    <div className="flex items-center justify-between border-b border-border px-6 py-3">
                      <span className="text-[11px] font-medium text-primary">
                        Selected ({activeFeatures.length})
                      </span>
                      <button
                        onClick={() => setActiveFeatures([])}
                        className="text-[10px] text-muted-foreground hover:text-destructive"
                      >
                        Clear
                      </button>
                    </div>
                    <div className="max-h-[200px] space-y-2 overflow-auto p-4">
                      {activeFeatures.map((f) => (
                        <FeatureCard
                          key={f.feature_idx}
                          feature={f}
                          onRemove={() => removeFeature(f.feature_idx)}
                          onStrength={(s) => setStrength(f.feature_idx, s)}
                        />
                      ))}
                    </div>
                  </div>
                )}
                <div className="border-b border-border px-6 py-3">
                  <span className="text-[11px] font-medium text-muted-foreground">
                    {modal.results.length ? "Search Results" : "Results"}
                  </span>
                </div>
                <div className="flex-1 overflow-auto p-4">
                  {modal.loading && (
                    <div className="flex items-center gap-3 p-4 text-[13px] text-muted-foreground">
                      <Spinner className="h-4 w-4" /> Searching...
                    </div>
                  )}
                  {!modal.loading && !modal.results.length && (
                    <div className="flex h-full items-center justify-center text-center text-[14px] text-muted-foreground/70">
                      {modal.query ? "No results" : "Search or browse features"}
                    </div>
                  )}
                  {!modal.loading && modal.results.length > 0 && (
                    <div className="space-y-3">
                      {modal.results.map((f) => (
                        <div
                          key={f.feature_idx}
                          className={cn(
                            "rounded-lg border p-4",
                            hasFeature(f.feature_idx)
                              ? "border-primary/30 bg-primary/5"
                              : "border-border bg-card",
                          )}
                        >
                          <div className="mb-3 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <AddButton
                                added={hasFeature(f.feature_idx)}
                                onClick={() =>
                                  addFeature(f.feature_idx, f.description)
                                }
                              />
                              <span className="font-mono text-[12px] text-primary">
                                #{f.feature_idx}
                              </span>
                            </div>
                            <span className="text-[11px] text-muted-foreground">
                              {(f.relevance_score * 100).toFixed(0)}%
                            </span>
                          </div>
                          <p className="text-[12px] text-muted-foreground">
                            {f.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="border-t border-border px-6 py-4">
              <button
                onClick={closeModal}
                className="rounded-lg bg-primary px-6 py-2.5 text-[13px] font-medium text-primary-foreground hover:bg-primary/90"
              >
                Done{activeFeatures.length > 0 && ` (${activeFeatures.length})`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chat Panel */}
      <div className="flex w-[480px] flex-col border-r border-border">
        <div className="border-b border-border px-4 py-3">
          <span className="text-[12px] font-medium text-muted-foreground">
            Chat
          </span>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {!messages.length && (
            <div className="flex h-full items-center justify-center text-center text-[14px] text-muted-foreground/70">
              Type a prompt to start
            </div>
          )}
          <div className="space-y-4">
            {messages.map((m) => (
              <div
                key={m.id}
                className={cn(
                  "rounded-lg p-3",
                  m.role === "user"
                    ? "bg-muted"
                    : "border border-border bg-card",
                )}
              >
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-[10px] font-medium text-muted-foreground">
                    {m.role === "user" ? "You" : "Assistant"}
                  </span>
                  {m.steered && (
                    <span className="rounded bg-primary/20 px-1.5 py-0.5 text-[9px] text-primary">
                      steered
                    </span>
                  )}
                </div>
                <p className="text-[13px] leading-relaxed">{m.content}</p>
                {m.result && (
                  <button
                    onClick={() =>
                      setSelection({ msgId: m.id, tokenIdx: null })
                    }
                    className={cn(
                      "mt-2 text-[11px]",
                      selection?.msgId === m.id
                        ? "text-primary"
                        : "text-muted-foreground hover:text-primary",
                    )}
                  >
                    {selection?.msgId === m.id ? "Viewing" : "View analysis"} →
                  </button>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 p-3 text-[13px] text-muted-foreground">
                <Spinner /> Generating...
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        </div>

        <div className="border-t border-border">
          {activeFeatures.length > 0 && (
            <div className="border-b border-border px-4 py-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[10px] font-medium text-muted-foreground">
                  Active Steering ({activeFeatures.length})
                </span>
                <button
                  onClick={() => setActiveFeatures([])}
                  className="text-[10px] text-muted-foreground hover:text-destructive"
                >
                  Clear
                </button>
              </div>
              <div className="space-y-2">
                {activeFeatures.map((f) => (
                  <FeatureCard
                    key={f.feature_idx}
                    feature={f}
                    onRemove={() => removeFeature(f.feature_idx)}
                    onStrength={(s) => setStrength(f.feature_idx, s)}
                  />
                ))}
              </div>
            </div>
          )}
          <div className="flex gap-2 p-4">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" &&
                !e.shiftKey &&
                input.trim() &&
                !loading &&
                (e.preventDefault(), handleSend())
              }
              placeholder="Enter prompt..."
              rows={2}
              className="flex-1 resize-none rounded-lg border border-border bg-card px-3 py-2 text-[13px] placeholder-muted-foreground/50 focus:border-primary focus:outline-none"
            />
            <div className="flex flex-col gap-2">
              <button
                onClick={handleSend}
                disabled={!input.trim() || loading}
                className="rounded-lg border border-border bg-card px-4 py-2 text-[12px] font-medium hover:bg-muted disabled:opacity-50"
              >
                Send
              </button>
              <button
                onClick={openModal}
                disabled={loading}
                className="rounded-lg bg-primary px-4 py-2 text-[12px] font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                Tune
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Analysis Panel */}
      <div className="flex flex-1 flex-col">
        <div className="flex items-center gap-4 border-b border-border px-6 py-3">
          {result ? (
            <>
              <span className="text-[12px] text-muted-foreground">
                {allTokens.length} tokens
              </span>
              {result.steering && (
                <span className="rounded bg-primary/20 px-2 py-0.5 text-[11px] font-medium text-primary">
                  steered
                </span>
              )}
            </>
          ) : (
            <span className="text-[12px] text-muted-foreground/70">
              Select a message to view
            </span>
          )}
        </div>

        {result ? (
          <div className="flex flex-1 overflow-hidden">
            {/* Heatmap */}
            <div className="flex w-1/2 flex-col border-r border-border">
              <div className="border-b border-border px-4 py-2">
                <span className="text-[11px] font-medium text-muted-foreground">
                  {result.steering ? "Steered Tokens" : "Tokens"}
                </span>
              </div>
              <div className="flex-1 overflow-auto p-4">
                <div className="flex flex-wrap gap-1">
                  {allTokens.map((t, i) => {
                    const act = t.features?.[0]?.activation || 0;
                    const pct = maxAct > 0 ? act / maxAct : 0;
                    const bg =
                      pct < 0.2
                        ? "bg-primary/10"
                        : pct < 0.4
                          ? "bg-primary/20"
                          : pct < 0.6
                            ? "bg-primary/30"
                            : pct < 0.8
                              ? "bg-primary/40"
                              : "bg-primary/50";
                    return (
                      <button
                        key={i}
                        onClick={() =>
                          setSelection((s) => s && { ...s, tokenIdx: i })
                        }
                        className={cn(
                          "rounded px-1.5 py-1 font-mono text-[12px]",
                          bg,
                          selection?.tokenIdx === i
                            ? "ring-2 ring-primary ring-offset-1 ring-offset-background"
                            : "hover:ring-1 hover:ring-primary/50",
                          t.isOutput && "border-b-2 border-primary",
                        )}
                      >
                        {t.token.replace(/\s/g, "·")}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex items-center gap-4 border-t border-border px-4 py-2 text-[10px] text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-4 rounded-sm bg-primary/20" />
                  <span>Low</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-4 rounded-sm bg-primary/60" />
                  <span>High</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-4 border-b-2 border-primary" />
                  <span>Output</span>
                </div>
              </div>
            </div>

            {/* Details */}
            <div className="flex w-1/2 flex-col">
              <div className="flex flex-1 flex-col overflow-hidden border-b border-border">
                <div className="border-b border-border px-4 py-2">
                  <span className="text-[11px] font-medium text-muted-foreground">
                    {selectedToken
                      ? `Features: "${selectedToken.token}"`
                      : "Select Token"}
                  </span>
                </div>
                <div className="flex-1 overflow-auto p-4">
                  {selectedToken?.features?.length ? (
                    <div className="space-y-2">
                      {selectedToken.features.map((f, i) => (
                        <div
                          key={i}
                          className={cn(
                            "rounded-lg border p-3",
                            hasFeature(f.feature_idx)
                              ? "border-primary/30 bg-primary/5"
                              : "border-border bg-card",
                          )}
                        >
                          <div className="mb-2 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <AddButton
                                added={hasFeature(f.feature_idx)}
                                onClick={() =>
                                  addFeature(f.feature_idx, f.explanation)
                                }
                              />
                              <span className="font-mono text-[11px] text-primary">
                                #{f.feature_idx}
                              </span>
                            </div>
                            <span className="font-mono text-[11px] text-muted-foreground">
                              {f.activation.toFixed(2)}
                            </span>
                          </div>
                          <p className="mb-2 text-[12px] text-muted-foreground">
                            {f.explanation}
                          </p>
                          <div className="h-1.5 w-full rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-primary"
                              style={{
                                width: `${Math.min((f.activation / maxAct) * 100, 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex h-full items-center justify-center text-[13px] text-muted-foreground/70">
                      {selectedToken ? "No features" : "Click token to inspect"}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-1 flex-col overflow-hidden">
                <div className="border-b border-border px-4 py-2">
                  <span className="text-[11px] font-medium text-muted-foreground">
                    {result.steering ? "Comparison" : "Output"}
                  </span>
                </div>
                <div className="flex-1 overflow-auto p-4">
                  {result.steering ? (
                    <div className="grid h-full grid-cols-2 gap-3">
                      <div className="flex flex-col rounded-lg border border-border bg-card p-3">
                        <div className="mb-2 text-[10px] font-medium text-muted-foreground">
                          Baseline
                        </div>
                        <p className="flex-1 font-mono text-[12px] leading-relaxed text-muted-foreground">
                          {result.generate?.full_text}
                        </p>
                      </div>
                      <div className="flex flex-col rounded-lg border border-primary/30 bg-primary/5 p-3">
                        <div className="mb-2 text-[10px] font-medium text-primary">
                          Steered
                        </div>
                        <p className="flex-1 font-mono text-[12px] leading-relaxed">
                          {result.steering.full_text}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-border bg-card p-3">
                      <p className="font-mono text-[12px] leading-relaxed">
                        {result.generate?.full_text}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center text-center">
            <p className="text-[14px] text-muted-foreground/70">
              Generate a response and click "View analysis"
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
