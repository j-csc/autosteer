"use client";

import { useState } from "react";
import { MixerPanel } from "@/components/mixer-panel";
import { TokenHeatmap } from "@/components/token-heatmap";
import { OutcomeDelta } from "@/components/outcome-delta";
import { ReplayBar } from "@/components/replay-bar";
import testData from "@/test.json";

export default function DemoPage() {
  const [currentStep, setCurrentStep] = useState(0);

  // Filter data up to current step
  const allTokens = [
    ...testData.input_token_explanations,
    ...testData.output_token_explanations,
  ];

  const inputTokenCount = testData.input_token_explanations.length;
  const visibleInputTokens = Math.min(currentStep + 1, inputTokenCount);
  const visibleOutputTokens = Math.max(0, currentStep + 1 - inputTokenCount);

  const filteredData = {
    ...testData,
    input_token_explanations: testData.input_token_explanations.slice(
      0,
      visibleInputTokens,
    ),
    output_token_explanations: testData.output_token_explanations.slice(
      0,
      visibleOutputTokens,
    ),
  };

  return (
    <div className="flex h-screen flex-col">
      <ReplayBar
        data={testData}
        currentStep={currentStep}
        onStepChange={setCurrentStep}
      />

      <div className="flex flex-1 overflow-hidden">
        <div className="border-border w-[50%] overflow-y-auto border-r p-4">
          <OutcomeDelta data={filteredData} />
        </div>

        <div className="border-border w-[50%] overflow-y-auto p-4">
          <TokenHeatmap data={filteredData} />
        </div>
      </div>

      <div className="border-border h-[30%] overflow-auto border-t p-4">
        <MixerPanel data={filteredData} />
      </div>
    </div>
  );
}
