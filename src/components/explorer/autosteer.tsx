"use client";

import { useState, useTransition } from "react";
import { fetchFeatures } from "@/app/actions/fetchFeatures";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { ScrollArea } from "../ui/scroll-area";
import { Send, BookOpen, X } from "lucide-react";
import { Slider } from "../ui/slider";

type Feature = {
  description: string;
  intensity: number;
};

export default function Autosteer() {
  const [userInput, setUserInput] = useState("");
  const [features, setFeatures] = useState<Feature[]>([
    {
      description: "The model is about to generate creative content",
      intensity: 5,
    },
    {
      description: "Positive sentiment in creative or poetic contexts",
      intensity: 5,
    },
    { description: "Line breaks in song lyrics or poetry", intensity: 0 },
    { description: "History and Context of Mathematics", intensity: 0 },
    {
      description: "Rhyme-ending tokens in poetry and lyrical writing",
      intensity: 0,
    },
    { description: "Technical fields in math and science", intensity: 0 },
    {
      description: "Informal greeting questions using contractions",
      intensity: 0,
    },
    { description: "Comma punctuation", intensity: 0 },
  ]);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userInput.trim()) {
      startTransition(async () => {
        // Simulating API call
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setFeatures((prevFeatures) => [
          ...prevFeatures,
          { description: userInput, intensity: 0 },
        ]);
      });
      setUserInput("");
    }
  };

  const handleIntensityChange = (index: number, newIntensity: number) => {
    setFeatures((prevFeatures) =>
      prevFeatures.map((feature, i) =>
        i === index ? { ...feature, intensity: newIntensity } : feature
      )
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4">
        <form onSubmit={handleSubmit} className="flex space-x-2 mb-4">
          <div className="flex-grow">
            <Input
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="Describe your desired features..."
              className="w-full"
            />
          </div>
          <div className="flex-shrink-0">
            <Button type="submit" size="icon">
              <Send className="h-4 w-4" />
              <span className="sr-only">Find Features</span>
            </Button>
          </div>
        </form>
      </div>
      <ScrollArea className="flex-grow">
        <div className="px-4 space-y-2">
          {isPending && <p>Loading features...</p>}

          {features.map((feature: Feature, index: number) => (
            <div
              key={index}
              className=" bg-gray-100 bg-opacity-35 dark:bg-gray-800 dark:bg-opacity-35 rounded-lg p-5 flex flex-col space-y-2"
            >
              <div className="flex justify-between items-center">
                <span className="text-sm">{feature.description}</span>
                <div className="flex space-x-2">
                  <BookOpen className="h-4 w-4" />
                  <X className="h-4 w-4" />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs">-10</span>
                <Slider
                  min={-10}
                  max={10}
                  step={1}
                  value={[feature.intensity]}
                  onValueChange={(value) =>
                    handleIntensityChange(index, value[0])
                  }
                  className="flex-grow"
                />
                <span className="text-xs">+10</span>
                <span
                  className={`text-xs font-bold ${
                    feature.intensity > 0
                      ? "text-green-600 dark:text-green-400"
                      : ""
                  }`}
                >
                  {feature.intensity > 0 && "+"}
                  {feature.intensity}
                </span>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
